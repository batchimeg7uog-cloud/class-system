-- Avoid recursive RLS checks and consolidate read policies.

create index if not exists guardian_children_linked_by_idx on public.guardian_children(linked_by);
create index if not exists guardian_invitations_child_idx on public.guardian_invitations(child_id);
create index if not exists guardian_invitations_used_by_idx on public.guardian_invitations(used_by) where used_by is not null;

create policy "guardian_invitations_no_direct_access"
on public.guardian_invitations for select to authenticated
using (false);

create or replace function private.can_view_child(p_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    exists (
      select 1 from public.children c
      where c.id = p_child_id and c.teacher_id = (select auth.uid())
    )
    or exists (
      select 1 from public.guardian_children gc
      where gc.child_id = p_child_id and gc.guardian_id = (select auth.uid())
    )
  );
$$;

create or replace function private.can_view_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    exists (
      select 1 from public.groups g
      where g.id = p_group_id and g.teacher_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.children c
      join public.guardian_children gc on gc.child_id = c.id
      where c.group_id = p_group_id and gc.guardian_id = (select auth.uid())
    )
  );
$$;

create or replace function private.can_view_child_work(p_storage_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    split_part(p_storage_path, '/', 1) = (select auth.uid())::text
    or exists (
      select 1
      from public.observation_media om
      join public.guardian_children gc on gc.child_id = om.child_id
      where om.storage_path = p_storage_path and gc.guardian_id = (select auth.uid())
    )
  );
$$;

revoke all on function private.can_view_child(uuid) from public, anon;
revoke all on function private.can_view_group(uuid) from public, anon;
revoke all on function private.can_view_child_work(text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.can_view_child(uuid) to authenticated;
grant execute on function private.can_view_group(uuid) to authenticated;
grant execute on function private.can_view_child_work(text) to authenticated;

drop policy if exists "children_select_own" on public.children;
drop policy if exists "children_select_linked_guardian" on public.children;
create policy "children_select_authorized" on public.children for select to authenticated
using (private.can_view_child(id));

drop policy if exists "groups_select_own" on public.groups;
drop policy if exists "groups_select_linked_guardian" on public.groups;
create policy "groups_select_authorized" on public.groups for select to authenticated
using (private.can_view_group(id));

drop policy if exists "observations_select_own" on public.observations;
drop policy if exists "observations_select_linked_guardian" on public.observations;
create policy "observations_select_authorized" on public.observations for select to authenticated
using (private.can_view_child(child_id));

drop policy if exists "media_select_own" on public.observation_media;
drop policy if exists "media_select_linked_guardian" on public.observation_media;
create policy "media_select_authorized" on public.observation_media for select to authenticated
using (private.can_view_child(child_id));

drop policy if exists "summaries_select_own" on public.period_summaries;
drop policy if exists "summaries_select_linked_guardian" on public.period_summaries;
create policy "summaries_select_authorized" on public.period_summaries for select to authenticated
using (private.can_view_child(child_id));

drop policy if exists "guardian_links_select_own" on public.guardian_children;
drop policy if exists "teacher_links_select_own_children" on public.guardian_children;
create policy "guardian_links_select_authorized" on public.guardian_children for select to authenticated
using ((select auth.uid()) = guardian_id or private.can_view_child(child_id));

drop policy if exists "child_work_select_own" on storage.objects;
drop policy if exists "child_work_select_linked_guardian" on storage.objects;
create policy "child_work_select_authorized" on storage.objects for select to authenticated
using (bucket_id = 'child-work' and private.can_view_child_work(name));
