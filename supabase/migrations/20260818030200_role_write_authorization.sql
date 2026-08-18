-- Require an explicit teacher role for every teacher-side mutation.

create or replace function private.has_account_role(p_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid()) and r.role = p_role
  );
$$;

revoke all on function private.has_account_role(text) from public, anon;
grant execute on function private.has_account_role(text) to authenticated;

create or replace function private.can_view_child(p_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    (
      exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'teacher')
      and exists (select 1 from public.children c where c.id = p_child_id and c.teacher_id = (select auth.uid()))
    )
    or (
      exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'guardian')
      and exists (select 1 from public.guardian_children gc where gc.child_id = p_child_id and gc.guardian_id = (select auth.uid()))
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
    (
      exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'teacher')
      and exists (select 1 from public.groups g where g.id = p_group_id and g.teacher_id = (select auth.uid()))
    )
    or (
      exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'guardian')
      and exists (
        select 1 from public.children c
        join public.guardian_children gc on gc.child_id = c.id
        where c.group_id = p_group_id and gc.guardian_id = (select auth.uid())
      )
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
    (
      exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'teacher')
      and split_part(p_storage_path, '/', 1) = (select auth.uid())::text
    )
    or (
      exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'guardian')
      and exists (
        select 1 from public.observation_media om
        join public.guardian_children gc on gc.child_id = om.child_id
        where om.storage_path = p_storage_path and gc.guardian_id = (select auth.uid())
      )
    )
  );
$$;

drop policy if exists "groups_insert_own" on public.groups;
drop policy if exists "groups_update_own" on public.groups;
drop policy if exists "groups_delete_own" on public.groups;
create policy "groups_insert_teacher" on public.groups for insert to authenticated
with check (private.has_account_role('teacher') and (select auth.uid()) = teacher_id);
create policy "groups_update_teacher" on public.groups for update to authenticated
using (private.has_account_role('teacher') and (select auth.uid()) = teacher_id)
with check (private.has_account_role('teacher') and (select auth.uid()) = teacher_id);
create policy "groups_delete_teacher" on public.groups for delete to authenticated
using (private.has_account_role('teacher') and (select auth.uid()) = teacher_id);

drop policy if exists "children_insert_own" on public.children;
drop policy if exists "children_update_own" on public.children;
drop policy if exists "children_delete_own" on public.children;
create policy "children_insert_teacher" on public.children for insert to authenticated
with check (
  private.has_account_role('teacher') and (select auth.uid()) = teacher_id
  and exists (select 1 from public.groups g where g.id = children.group_id and g.teacher_id = (select auth.uid()))
);
create policy "children_update_teacher" on public.children for update to authenticated
using (private.has_account_role('teacher') and (select auth.uid()) = teacher_id)
with check (
  private.has_account_role('teacher') and (select auth.uid()) = teacher_id
  and exists (select 1 from public.groups g where g.id = children.group_id and g.teacher_id = (select auth.uid()))
);
create policy "children_delete_teacher" on public.children for delete to authenticated
using (private.has_account_role('teacher') and (select auth.uid()) = teacher_id);

drop policy if exists "observations_insert_own" on public.observations;
drop policy if exists "observations_update_own" on public.observations;
drop policy if exists "observations_delete_own" on public.observations;
create policy "observations_insert_teacher" on public.observations for insert to authenticated
with check (
  private.has_account_role('teacher') and (select auth.uid()) = teacher_id
  and exists (select 1 from public.children c where c.id = observations.child_id and c.teacher_id = (select auth.uid()))
);
create policy "observations_update_teacher" on public.observations for update to authenticated
using (private.has_account_role('teacher') and (select auth.uid()) = teacher_id)
with check (private.has_account_role('teacher') and (select auth.uid()) = teacher_id);
create policy "observations_delete_teacher" on public.observations for delete to authenticated
using (private.has_account_role('teacher') and (select auth.uid()) = teacher_id);

drop policy if exists "media_insert_own" on public.observation_media;
drop policy if exists "media_delete_own" on public.observation_media;
create policy "media_insert_teacher" on public.observation_media for insert to authenticated
with check (
  private.has_account_role('teacher') and (select auth.uid()) = teacher_id
  and exists (select 1 from public.observations o where o.id = observation_media.observation_id and o.teacher_id = (select auth.uid()))
);
create policy "media_delete_teacher" on public.observation_media for delete to authenticated
using (private.has_account_role('teacher') and (select auth.uid()) = teacher_id);

drop policy if exists "summaries_insert_own" on public.period_summaries;
drop policy if exists "summaries_update_own" on public.period_summaries;
drop policy if exists "summaries_delete_own" on public.period_summaries;
create policy "summaries_insert_teacher" on public.period_summaries for insert to authenticated
with check (
  private.has_account_role('teacher') and (select auth.uid()) = teacher_id
  and exists (select 1 from public.children c where c.id = period_summaries.child_id and c.teacher_id = (select auth.uid()))
);
create policy "summaries_update_teacher" on public.period_summaries for update to authenticated
using (private.has_account_role('teacher') and (select auth.uid()) = teacher_id)
with check (private.has_account_role('teacher') and (select auth.uid()) = teacher_id);
create policy "summaries_delete_teacher" on public.period_summaries for delete to authenticated
using (private.has_account_role('teacher') and (select auth.uid()) = teacher_id);

drop policy if exists "child_work_insert_own" on storage.objects;
drop policy if exists "child_work_update_own" on storage.objects;
drop policy if exists "child_work_delete_own" on storage.objects;
create policy "child_work_insert_teacher" on storage.objects for insert to authenticated
with check (
  private.has_account_role('teacher') and bucket_id = 'child-work'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "child_work_update_teacher" on storage.objects for update to authenticated
using (
  private.has_account_role('teacher') and bucket_id = 'child-work'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  private.has_account_role('teacher') and bucket_id = 'child-work'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "child_work_delete_teacher" on storage.objects for delete to authenticated
using (
  private.has_account_role('teacher') and bucket_id = 'child-work'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
