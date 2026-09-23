begin;
create table public.gallery_offers (
  work_id uuid not null references public.gallery_artworks(id) on delete cascade,
  kind text not null check(kind in ('print','digital','nft')),
  amount_minor integer not null check(amount_minor between 1 and 100000000),
  currency text not null default 'EUR' check(currency='EUR'),
  rights text not null check(length(trim(rights)) between 10 and 2000),
  checkout_url text not null check(length(checkout_url)<=1000),
  chain text, contract text, token_id text,
  published boolean not null default false,
  primary key(work_id,kind),
  check((kind in ('print','digital') and checkout_url ~ '^https://(buy|checkout)\.stripe\.com/[A-Za-z0-9_/?=&%-]+$')
    or (kind='nft' and chain in ('ethereum','base','matic') and contract ~ '^0x[0-9a-fA-F]{40}$' and token_id ~ '^[0-9]+$'
      and checkout_url='https://opensea.io/assets/'||chain||'/'||contract||'/'||token_id
      and chain is not null and contract is not null and token_id is not null))
);
alter table public.gallery_offers enable row level security;
revoke all on public.gallery_offers from anon,authenticated;
grant select on public.gallery_offers to anon,authenticated;
grant insert,update,delete on public.gallery_offers to authenticated;
grant all on public.gallery_offers to service_role;
create function ua_social.work_is_public(work uuid) returns boolean
language sql stable security definer set search_path='' as $$ select exists(select 1 from public.gallery_artworks where id=work and published) $$;
revoke all on function ua_social.work_is_public(uuid) from public;
grant usage on schema ua_social to anon;
grant execute on function ua_social.work_is_public(uuid) to anon,authenticated;
create policy "Visitors read available offers" on public.gallery_offers for select to anon,authenticated
  using(published and ua_social.work_is_public(work_id));
create policy "Administrators manage offers" on public.gallery_offers for all to authenticated
  using(exists(select 1 from public.gallery_admins where user_id=(select auth.uid())))
  with check(exists(select 1 from public.gallery_admins where user_id=(select auth.uid())));
commit;
