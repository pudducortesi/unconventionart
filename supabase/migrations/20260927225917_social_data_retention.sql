-- Preserve social data for the user-approved retention windows.
create extension if not exists pg_cron;

alter table ua_social.profiles add column deleted_at timestamptz;
create index profiles_deleted_at_idx on ua_social.profiles (deleted_at) where deleted_at is not null;
alter table ua_social.profiles drop constraint profiles_user_id_fkey;

alter table ua_social.rooms alter column owner_id drop not null;
alter table ua_social.rooms drop constraint rooms_owner_id_fkey;
alter table ua_social.rooms
  add constraint rooms_owner_id_fkey
  foreign key (owner_id) references auth.users(id) on delete set null;

alter table ua_social.reports
  add column reporter_name text,
  add column target_name text,
  add column room_name text,
  alter column user_id drop not null,
  alter column target_id drop not null,
  alter column room_id drop not null;
alter table ua_social.reports drop constraint reports_user_id_fkey;
alter table ua_social.reports drop constraint reports_target_id_fkey;
alter table ua_social.reports drop constraint reports_room_id_fkey;
alter table ua_social.reports
  add constraint reports_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null,
  add constraint reports_target_id_fkey foreign key (target_id) references auth.users(id) on delete set null,
  add constraint reports_room_id_fkey foreign key (room_id) references ua_social.rooms(id) on delete set null;

create index messages_created_at_idx on ua_social.messages (created_at);
create index reports_created_at_idx on ua_social.reports (created_at);

CREATE OR REPLACE FUNCTION ua_social.dispatch(action text, payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); rid uuid; room ua_social.rooms; result jsonb;
  target uuid; previous timestamptz; delay interval; a jsonb; n text; pos jsonb;
begin
  if uid is null or not exists(select 1 from auth.users where id=uid and deleted_at is null and (banned_until is null or banned_until<now()))
    or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'ua_login_required'; end if;
  if exists(select 1 from ua_social.profiles where user_id=uid and suspended) then raise exception 'ua_suspended'; end if;
  if action not in ('profile','save_profile','create','join','tick','chat','emote','leave','close','block','unblock','report','moderation','suspend') then raise exception 'ua_invalid_action'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,917));
  delay := case when action='tick' then interval '450 milliseconds' when action='create' then interval '10 seconds' when action='emote' then interval '4 seconds' else interval '500 milliseconds' end;
  select at into previous from ua_social.limits where user_id=uid and ua_social.limits.action=dispatch.action;
  if previous > clock_timestamp()-delay then raise exception 'ua_rate_limit'; end if;
  insert into ua_social.limits values(uid,action,clock_timestamp())
    on conflict on constraint limits_pkey do update set at=excluded.at;
  if action='profile' then
    return jsonb_build_object('profile',(select jsonb_build_object('id',user_id,'name',name,'avatar',avatar) from ua_social.profiles where user_id=uid),
      'blocks',coalesce((select jsonb_agg(jsonb_build_object('id',p.user_id,'name',p.name)) from ua_social.blocks b join ua_social.profiles p on p.user_id=b.target_id where b.user_id=uid),'[]'::jsonb));
  elsif action='save_profile' then
    a := payload->'avatar'; n:=trim(payload->>'name');
    if n is null or length(n) not between 2 and 32 or a is null then raise exception 'ua_invalid_profile'; end if;
    a := ua_social.normalize_avatar(a);
    insert into ua_social.profiles(user_id,name,avatar) values(uid,n,a)
      on conflict(user_id) do update set name=excluded.name,avatar=excluded.avatar;
    return jsonb_build_object('id',uid,'name',n,'avatar',a);
  elsif action in ('moderation','suspend') then
    if not exists(select 1 from public.gallery_admins where user_id=uid) then raise exception 'ua_forbidden'; end if;
    if action='suspend' then
      target:=(payload->>'target')::uuid;
      if target=uid then raise exception 'ua_forbidden'; end if;
      update ua_social.profiles set suspended=coalesce((payload->>'suspended')::boolean,true) where user_id=target;
      delete from ua_social.members where user_id=target;
      return '{}'::jsonb;
    end if;
    return coalesce((
      select jsonb_agg(to_jsonb(t))
      from (
        select r.id,r.user_id,r.reporter_name,r.target_id,
          coalesce(p.name,r.target_name,'Account eliminato') as target_name,
          r.room_id,r.room_name,r.reason,r.created_at,
          coalesce(p.suspended,false) as suspended
        from ua_social.reports r
        left join ua_social.profiles p on p.user_id=r.target_id
        order by r.created_at desc limit 100
      ) t
    ),'[]'::jsonb);
  end if;
  if not exists(select 1 from ua_social.profiles where user_id=uid) then raise exception 'ua_profile_required'; end if;
  if action='create' then
    if (select count(*) from ua_social.rooms where owner_id=uid and expires_at>now())>=3 then raise exception 'ua_room_limit'; end if;
    insert into ua_social.rooms(owner_id,name) values(uid,trim(payload->>'name')) returning * into room;
    insert into ua_social.members(room_id,user_id) values(room.id,uid);
    return jsonb_build_object('id',room.id,'name',room.name,'invite',room.invite,'owner',true,'expires_at',room.expires_at);
  elsif action='join' then
    select * into room from ua_social.rooms where invite=(payload->>'invite')::uuid and expires_at>now() for update;
    if room.id is null then raise exception 'ua_invite_invalid'; end if;
    if exists(select 1 from ua_social.blocks where (user_id=uid and target_id=room.owner_id) or (target_id=uid and user_id=room.owner_id)) then raise exception 'ua_invite_invalid'; end if;
    if (select count(*) from ua_social.members where room_id=room.id and seen_at>now()-interval '30 seconds' and user_id<>uid)>=16 then raise exception 'ua_room_full'; end if;
    insert into ua_social.members(room_id,user_id) values(room.id,uid) on conflict(room_id,user_id) do update set seen_at=now();
    return jsonb_build_object('id',room.id,'name',room.name,'invite',room.invite,'owner',room.owner_id=uid,'expires_at',room.expires_at);
  elsif action='unblock' then
    delete from ua_social.blocks where user_id=uid and target_id=(payload->>'target')::uuid;
    return '{}'::jsonb;
  end if;
  rid:=(payload->>'room')::uuid;
  select * into room from ua_social.rooms where id=rid and expires_at>now();
  if room.id is null or not exists(select 1 from ua_social.members where room_id=rid and user_id=uid) then raise exception 'ua_room_denied'; end if;
  if exists(select 1 from ua_social.blocks where (user_id=uid and target_id=room.owner_id) or (target_id=uid and user_id=room.owner_id)) then raise exception 'ua_room_denied'; end if;
  if action='leave' then
    delete from ua_social.members where room_id=rid and user_id=uid; return '{}'::jsonb;
  elsif action='close' then
    if room.owner_id is distinct from uid then raise exception 'ua_forbidden'; end if;
    update ua_social.rooms set expires_at=now() where id=rid;
    delete from ua_social.members where room_id=rid; return '{}'::jsonb;
  elsif action in ('block','report') then
    target:=(payload->>'target')::uuid;
    if target=uid or not exists(select 1 from ua_social.members where room_id=rid and user_id=target) then raise exception 'ua_target_invalid'; end if;
    if action='block' then insert into ua_social.blocks values(uid,target) on conflict do nothing;
    else insert into ua_social.reports(user_id,target_id,room_id,reason,reporter_name,target_name,room_name) values(uid,target,rid,trim(payload->>'reason'),(select name from ua_social.profiles where user_id=uid),(select name from ua_social.profiles where user_id=target),room.name); end if;
    return '{}'::jsonb;
  elsif action='emote' then
    if payload->>'gesture' is distinct from 'wave' then raise exception 'ua_invalid_gesture'; end if;
    update ua_social.members set emote_until=now()+interval '3 seconds' where room_id=rid and user_id=uid;
    return '{}'::jsonb;
  elsif action='chat' then
    insert into ua_social.messages(room_id,user_id,body) values(rid,uid,trim(payload->>'body'));
    return '{}'::jsonb;
  elsif action='tick' then
    pos:=payload->'position';
    if pos is null or (pos->>'x')::real not between -100 and 100 or (pos->>'z')::real not between -200 and 100
      or (pos->>'y')::real not between 0 and 30 or (pos->>'yaw')::real not between -10000 and 10000 then raise exception 'ua_position_invalid'; end if;
    perform 1 from ua_social.rooms where id=rid for update;
    if (select count(*) from ua_social.members where room_id=rid and seen_at>now()-interval '30 seconds' and user_id<>uid)>=16 then raise exception 'ua_room_full'; end if;
    update ua_social.members set x=(pos->>'x')::real,z=(pos->>'z')::real,y=(pos->>'y')::real,yaw=(pos->>'yaw')::real,seen_at=now() where room_id=rid and user_id=uid;
    select jsonb_build_object('participants',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'name',p.name,'avatar',p.avatar,'x',m.x,'z',m.z,'y',m.y,'yaw',m.yaw,'wave',coalesce(m.emote_until>now(),false))) from ua_social.members m join ua_social.profiles p on p.user_id=m.user_id
      where m.room_id=rid and m.seen_at>now()-interval '30 seconds' and not p.suspended
        and not exists(select 1 from ua_social.blocks b where (b.user_id=uid and b.target_id=m.user_id) or (b.target_id=uid and b.user_id=m.user_id))),'[]'::jsonb),
      'messages',coalesce((select jsonb_agg(t order by t.created_at) from (select m.id,m.user_id,p.name,m.body,m.created_at from ua_social.messages m join ua_social.profiles p on p.user_id=m.user_id
        where m.room_id=rid and m.created_at>now()-interval '24 hours' and not p.suspended
          and not exists(select 1 from ua_social.blocks b where (b.user_id=uid and b.target_id=m.user_id) or (b.target_id=uid and b.user_id=m.user_id))
        order by m.created_at desc limit 50)t),'[]'::jsonb)) into result;
    return result;
  end if;
  raise exception 'ua_invalid_action';
end $function$
;

create or replace function ua_private.capture_social_account_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  update ua_social.profiles
    set deleted_at = coalesce(deleted_at, pg_catalog.clock_timestamp()),
        suspended = true
    where user_id = old.id;

  -- Close rooms immediately, but keep their messages until their 24-hour cutoff.
  update ua_social.rooms
    set expires_at = least(expires_at, pg_catalog.clock_timestamp())
    where owner_id = old.id;

  delete from ua_social.members where user_id = old.id;
  return old;
end;
$function$;

revoke all on function ua_private.capture_social_account_deletion() from public, anon, authenticated, service_role;
drop trigger if exists ua_social_capture_account_deletion on auth.users;
create trigger ua_social_capture_account_deletion
  before delete on auth.users
  for each row execute function ua_private.capture_social_account_deletion();

create or replace function ua_private.purge_social_data()
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  delete from ua_social.messages
    where created_at < pg_catalog.clock_timestamp() - interval '24 hours';

  delete from ua_social.rooms
    where expires_at < pg_catalog.clock_timestamp() - interval '24 hours';

  delete from ua_social.profiles
    where deleted_at < pg_catalog.clock_timestamp() - interval '30 days';

  delete from ua_social.reports
    where created_at < pg_catalog.clock_timestamp() - interval '90 days';
end;
$function$;

revoke all on function ua_private.purge_social_data() from public, anon, authenticated, service_role;
select cron.schedule('ua-social-retention', '*/5 * * * *', 'select ua_private.purge_social_data();');

comment on column ua_social.profiles.deleted_at is
  'Auth account deletion timestamp; retain the profile for 30 days before purging.';
comment on function ua_private.purge_social_data() is
  'Deletes social messages after 24h, deleted profiles after 30d, and reports after 90d.';
