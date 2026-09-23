begin;
create table public.gallery_videos (
 id uuid primary key, title text not null check(length(trim(title)) between 1 and 160),
 description text not null default '' check(length(description)<=3000),
 video_path text not null check(video_path in (id::text||'/clip.mp4',id::text||'/clip.webm')),
 preview_path text not null check(preview_path=id::text||'/poster.jpg'),
 width integer not null check(width>0), height integer not null check(height>0),
 duration double precision not null check(duration>=0),
 hall_index integer not null default 3 check(hall_index in (3,5)),
 published boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.gallery_videos enable row level security;
revoke all on public.gallery_videos from anon,authenticated;
grant select,insert,update on public.gallery_videos to authenticated;
grant all on public.gallery_videos to service_role;
create policy "Video administrators read" on public.gallery_videos for select to authenticated using(exists(select 1 from public.gallery_admins where user_id=(select auth.uid())));
create policy "Video administrators upload drafts" on public.gallery_videos for insert to authenticated with check(not published and exists(select 1 from public.gallery_admins where user_id=(select auth.uid())));
create policy "Video administrators edit" on public.gallery_videos for update to authenticated using(exists(select 1 from public.gallery_admins where user_id=(select auth.uid()))) with check(exists(select 1 from public.gallery_admins where user_id=(select auth.uid())));
create function public.prepare_gallery_video() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 new.updated_at:=clock_timestamp();
 if new.published and (not exists(select 1 from storage.objects where bucket_id='gallery-videos' and name=new.video_path) or not exists(select 1 from storage.objects where bucket_id='gallery-previews' and name=new.preview_path)) then raise exception 'gallery_missing_files'; end if;
 return new;
end $$;
revoke all on function public.prepare_gallery_video() from public,anon,authenticated;
create trigger prepare_gallery_video before insert or update on public.gallery_videos for each row execute function public.prepare_gallery_video();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('gallery-videos','gallery-videos',false,52428800,array['video/mp4','video/webm']);
create policy "Video administrators read files" on storage.objects for select to authenticated using(bucket_id='gallery-videos' and exists(select 1 from public.gallery_admins where user_id=(select auth.uid())));
create policy "Video administrators upload files" on storage.objects for insert to authenticated with check(bucket_id='gallery-videos' and exists(select 1 from public.gallery_admins where user_id=(select auth.uid())));
drop policy "Gallery administrators clean incomplete uploads" on storage.objects;
create policy "Gallery administrators clean incomplete uploads" on storage.objects for delete to authenticated using(bucket_id in ('gallery-originals','gallery-previews','gallery-videos') and exists(select 1 from public.gallery_admins where user_id=(select auth.uid())) and not exists(select 1 from public.gallery_artworks where original_path=name or preview_path=name) and not exists(select 1 from public.gallery_videos where video_path=name or preview_path=name));
commit;
