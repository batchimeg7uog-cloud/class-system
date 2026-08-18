-- Teacher and guardian portals with invitation-based child access.

create schema if not exists private;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('teacher', 'guardian')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guardian_children (
  guardian_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  linked_by uuid not null references auth.users(id) on delete cascade,
  linked_at timestamptz not null default now(),
  primary key (guardian_id, child_id)
);

create table if not exists public.guardian_invitations (
  code text primary key check (code ~ '^[A-Z0-9]{8}$'),
  child_id uuid not null references public.children(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  check ((used_by is null and used_at is null) or (used_by is not null and used_at is not null))
);

create index if not exists guardian_children_child_idx on public.guardian_children(child_id);
create index if not exists guardian_invitations_teacher_idx on public.guardian_invitations(teacher_id, created_at desc);
create index if not exists guardian_invitations_active_idx on public.guardian_invitations(code) where used_at is null;

alter table public.user_roles enable row level security;
alter table public.guardian_children enable row level security;
alter table public.guardian_invitations enable row level security;

revoke all on table public.user_roles, public.guardian_children, public.guardian_invitations from anon, authenticated;
grant select on table public.user_roles to authenticated;
grant select on table public.guardian_children to authenticated;

create policy "roles_select_own" on public.user_roles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "guardian_links_select_own" on public.guardian_children for select to authenticated
using ((select auth.uid()) = guardian_id);

create policy "teacher_links_select_own_children" on public.guardian_children for select to authenticated
using (exists (
  select 1 from public.children c
  where c.id = guardian_children.child_id and c.teacher_id = (select auth.uid())
));

create or replace function private.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'account_role', 'teacher');
  if requested_role not in ('teacher', 'guardian') then
    requested_role := 'teacher';
  end if;
  insert into public.user_roles(user_id, role)
  values (new.id, requested_role)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user_role() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_role on auth.users;
create trigger on_auth_user_created_role
after insert on auth.users
for each row execute function private.handle_new_user_role();

insert into public.user_roles(user_id, role)
select id, 'teacher' from auth.users
on conflict (user_id) do nothing;

create or replace function public.create_guardian_invite(p_child_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  invite_code text;
begin
  if current_user_id is null then
    raise exception 'Нэвтэрсэн хэрэглэгч шаардлагатай.';
  end if;
  if not exists (
    select 1 from public.user_roles r
    where r.user_id = current_user_id and r.role = 'teacher'
  ) then
    raise exception 'Зөвхөн багш код үүсгэх эрхтэй.';
  end if;
  if not exists (
    select 1 from public.children c
    where c.id = p_child_id and c.teacher_id = current_user_id
  ) then
    raise exception 'Хүүхэд олдсонгүй эсвэл танд хамаарахгүй байна.';
  end if;

  loop
    invite_code := upper(substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 8));
    begin
      insert into public.guardian_invitations(code, child_id, teacher_id)
      values (invite_code, p_child_id, current_user_id);
      exit;
    exception when unique_violation then
      null;
    end;
  end loop;
  return invite_code;
end;
$$;

create or replace function public.claim_guardian_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  invite_row public.guardian_invitations%rowtype;
begin
  if current_user_id is null then
    raise exception 'Нэвтэрсэн хэрэглэгч шаардлагатай.';
  end if;
  if not exists (
    select 1 from public.user_roles r
    where r.user_id = current_user_id and r.role = 'guardian'
  ) then
    raise exception 'Зөвхөн асран хамгаалагч код ашиглах эрхтэй.';
  end if;

  select * into invite_row
  from public.guardian_invitations i
  where i.code = upper(trim(p_code))
    and i.used_at is null
    and i.expires_at > now()
  for update;

  if not found then
    raise exception 'Код буруу, ашиглагдсан эсвэл хугацаа дууссан байна.';
  end if;

  insert into public.guardian_children(guardian_id, child_id, linked_by)
  values (current_user_id, invite_row.child_id, invite_row.teacher_id)
  on conflict (guardian_id, child_id) do nothing;

  update public.guardian_invitations
  set used_by = current_user_id, used_at = now()
  where code = invite_row.code;

  return invite_row.child_id;
end;
$$;

revoke all on function public.create_guardian_invite(uuid) from public, anon;
revoke all on function public.claim_guardian_invite(text) from public, anon;
grant execute on function public.create_guardian_invite(uuid) to authenticated;
grant execute on function public.claim_guardian_invite(text) to authenticated;

create policy "children_select_linked_guardian" on public.children for select to authenticated
using (exists (
  select 1 from public.guardian_children gc
  where gc.child_id = children.id and gc.guardian_id = (select auth.uid())
));

create policy "groups_select_linked_guardian" on public.groups for select to authenticated
using (exists (
  select 1
  from public.children c
  join public.guardian_children gc on gc.child_id = c.id
  where c.group_id = groups.id and gc.guardian_id = (select auth.uid())
));

create policy "observations_select_linked_guardian" on public.observations for select to authenticated
using (exists (
  select 1 from public.guardian_children gc
  where gc.child_id = observations.child_id and gc.guardian_id = (select auth.uid())
));

create policy "media_select_linked_guardian" on public.observation_media for select to authenticated
using (exists (
  select 1 from public.guardian_children gc
  where gc.child_id = observation_media.child_id and gc.guardian_id = (select auth.uid())
));

create policy "summaries_select_linked_guardian" on public.period_summaries for select to authenticated
using (exists (
  select 1 from public.guardian_children gc
  where gc.child_id = period_summaries.child_id and gc.guardian_id = (select auth.uid())
));

create policy "child_work_select_linked_guardian" on storage.objects for select to authenticated
using (
  bucket_id = 'child-work'
  and exists (
    select 1
    from public.observation_media om
    join public.guardian_children gc on gc.child_id = om.child_id
    where om.storage_path = objects.name and gc.guardian_id = (select auth.uid())
  )
);

grant select on table public.children, public.groups, public.observations, public.observation_media, public.period_summaries to authenticated;
