-- Apply only to the dedicated UnconventionArt Supabase project.
begin;
create table public.gallery_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.gallery_admins enable row level security;
revoke all on public.gallery_admins from anon, authenticated;
grant select on public.gallery_admins to authenticated;
create policy "Read own administrator membership" on public.gallery_admins
  for select to authenticated using (user_id = (select auth.uid()));

create table public.gallery_artworks (
  id uuid primary key,
  title text not null check (length(trim(title)) between 1 and 160),
  description text not null default '' check (length(description) <= 3000),
  credit text not null default 'UnconventionArt' check (length(credit) <= 200),
  original_path text not null check (original_path ~ '^[a-f0-9-]{36}/original\.(jpg|png|webp)$'),
  preview_path text not null check (preview_path = id::text || '/preview.jpg'),
  width integer not null check (width between 1 and 40000),
  height integer not null check (height between 1 and 40000),
  hall_index integer check (hall_index between 0 and 9),
  wall_slot integer check (wall_slot between 0 and 19),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (split_part(original_path, '/', 1) = id::text),
  check (not published or (hall_index is not null and wall_slot is not null))
);
create unique index gallery_occupied_slot on public.gallery_artworks (hall_index, wall_slot) where published;
alter table public.gallery_artworks enable row level security;
revoke all on public.gallery_artworks from anon, authenticated;
grant select, insert, update on public.gallery_artworks to authenticated;
create policy "Administrators read works" on public.gallery_artworks for select to authenticated
  using (exists (select 1 from public.gallery_admins where user_id = (select auth.uid())));
create policy "Administrators create drafts" on public.gallery_artworks for insert to authenticated
  with check (not published and exists (select 1 from public.gallery_admins where user_id = (select auth.uid())));
create policy "Administrators edit works" on public.gallery_artworks for update to authenticated
  using (exists (select 1 from public.gallery_admins where user_id = (select auth.uid())))
  with check (exists (select 1 from public.gallery_admins where user_id = (select auth.uid())));

create function public.prepare_gallery_artwork() returns trigger language plpgsql security invoker set search_path = '' as $$
declare chosen_hall integer; chosen_slot integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(734619);
  new.updated_at := clock_timestamp();
  if new.published then
    if not exists(select 1 from storage.objects where bucket_id = 'gallery-previews' and name = new.preview_path)
      or not exists(select 1 from storage.objects where bucket_id = 'gallery-originals' and name = new.original_path) then
      raise exception 'gallery_missing_files';
    end if;
    -- Keep the existing position when possible; allocate empty slots atomically.
    if new.hall_index is null or new.wall_slot is null or
      (tg_op = 'UPDATE' and new.hall_index is distinct from old.hall_index) or
      exists(select 1 from public.gallery_artworks a where a.published and a.id <> new.id and a.hall_index = new.hall_index and a.wall_slot = new.wall_slot) then
      select h, s into chosen_hall, chosen_slot
      from generate_series(0,9) h cross join generate_series(0,19) s
      where (new.hall_index is null or h = new.hall_index)
        and not exists(select 1 from public.gallery_artworks a where a.published and a.id <> new.id and a.hall_index = h and a.wall_slot = s)
      order by h, s limit 1;
      if chosen_hall is null then raise exception 'gallery_capacity'; end if;
      new.hall_index := chosen_hall; new.wall_slot := chosen_slot;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.prepare_gallery_artwork() from public, anon, authenticated;
create trigger prepare_gallery_artwork before insert or update on public.gallery_artworks
  for each row execute function public.prepare_gallery_artwork();

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values
  ('gallery-originals','gallery-originals',false,41943040,array['image/jpeg','image/png','image/webp']),
  ('gallery-previews','gallery-previews',false,4194304,array['image/jpeg']);
create policy "Gallery administrators read private images" on storage.objects for select to authenticated
  using (bucket_id in ('gallery-originals','gallery-previews') and exists(select 1 from public.gallery_admins where user_id = (select auth.uid())));
create policy "Gallery administrators upload private images" on storage.objects for insert to authenticated
  with check (bucket_id in ('gallery-originals','gallery-previews') and exists(select 1 from public.gallery_admins where user_id = (select auth.uid())));
create policy "Gallery administrators clean incomplete uploads" on storage.objects for delete to authenticated
  using (bucket_id in ('gallery-originals','gallery-previews')
    and exists(select 1 from public.gallery_admins where user_id = (select auth.uid()))
    and not exists(select 1 from public.gallery_artworks where original_path = name or preview_path = name));
-- No public storage read, no original download endpoint, no self-enrollment.
grant all on public.gallery_admins, public.gallery_artworks to service_role;
commit;
