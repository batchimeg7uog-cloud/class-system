create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 120),
  kindergarten_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default extensions.gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  school_year text not null,
  age_band text,
  color text not null default '#8b5cf6',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, name, school_year)
);

create table if not exists public.children (
  id uuid primary key default extensions.gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 100),
  last_name text,
  preferred_name text,
  gender text,
  birth_date date,
  enrollment_date date,
  parent_one_name text,
  parent_one_phone text,
  parent_two_name text,
  parent_two_phone text,
  emergency_contact text,
  address text,
  medical_notes text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.observations (
  id uuid primary key default extensions.gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  observed_on date not null default current_date,
  language_score smallint not null default 3 check (language_score between 1 and 5),
  language_notes text,
  numeracy_score smallint not null default 3 check (numeracy_score between 1 and 5),
  numeracy_notes text,
  movement_score smallint not null default 3 check (movement_score between 1 and 5),
  movement_notes text,
  social_score smallint not null default 3 check (social_score between 1 and 5),
  social_notes text,
  art_score smallint not null default 3 check (art_score between 1 and 5),
  art_notes text,
  development_score smallint not null default 3 check (development_score between 1 and 5),
  development_notes text,
  environment_score smallint not null default 3 check (environment_score between 1 and 5),
  environment_notes text,
  summary text,
  next_steps text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.period_summaries (
  id uuid primary key default extensions.gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  period_type text not null check (period_type in ('week','month','quarter','year')),
  period_start date not null,
  period_end date not null,
  overall_summary text not null,
  strengths text,
  recommendations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, child_id, period_type, period_start, period_end),
  check (period_end >= period_start)
);

create table if not exists public.observation_media (
  id uuid primary key default extensions.gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  observation_id uuid not null references public.observations(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes between 1 and 8388608),
  created_at timestamptz not null default now()
);

create index if not exists groups_teacher_id_idx on public.groups (teacher_id);
create index if not exists children_teacher_group_idx on public.children (teacher_id, group_id);
create index if not exists observations_teacher_date_idx on public.observations (teacher_id, observed_on desc);
create index if not exists observations_child_date_idx on public.observations (child_id, observed_on desc);
create index if not exists period_summaries_child_period_idx on public.period_summaries (child_id, period_start desc);
create index if not exists observation_media_observation_idx on public.observation_media (observation_id);

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.children enable row level security;
alter table public.observations enable row level security;
alter table public.period_summaries enable row level security;
alter table public.observation_media enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "groups_select_own" on public.groups for select to authenticated using ((select auth.uid()) = teacher_id);
create policy "groups_insert_own" on public.groups for insert to authenticated with check ((select auth.uid()) = teacher_id);
create policy "groups_update_own" on public.groups for update to authenticated
  using ((select auth.uid()) = teacher_id) with check ((select auth.uid()) = teacher_id);
create policy "groups_delete_own" on public.groups for delete to authenticated using ((select auth.uid()) = teacher_id);

create policy "children_select_own" on public.children for select to authenticated using ((select auth.uid()) = teacher_id);
create policy "children_insert_own" on public.children for insert to authenticated with check (
  (select auth.uid()) = teacher_id and exists (
    select 1 from public.groups g where g.id = group_id and g.teacher_id = (select auth.uid())
  )
);
create policy "children_update_own" on public.children for update to authenticated
  using ((select auth.uid()) = teacher_id)
  with check (
    (select auth.uid()) = teacher_id and exists (
      select 1 from public.groups g where g.id = group_id and g.teacher_id = (select auth.uid())
    )
  );
create policy "children_delete_own" on public.children for delete to authenticated using ((select auth.uid()) = teacher_id);

create policy "observations_select_own" on public.observations for select to authenticated using ((select auth.uid()) = teacher_id);
create policy "observations_insert_own" on public.observations for insert to authenticated with check (
  (select auth.uid()) = teacher_id and
  exists (select 1 from public.children c where c.id = child_id and c.teacher_id = (select auth.uid()))
);
create policy "observations_update_own" on public.observations for update to authenticated
  using ((select auth.uid()) = teacher_id)
  with check ((select auth.uid()) = teacher_id);
create policy "observations_delete_own" on public.observations for delete to authenticated using ((select auth.uid()) = teacher_id);

create policy "summaries_select_own" on public.period_summaries for select to authenticated using ((select auth.uid()) = teacher_id);
create policy "summaries_insert_own" on public.period_summaries for insert to authenticated with check (
  (select auth.uid()) = teacher_id and
  exists (select 1 from public.children c where c.id = child_id and c.teacher_id = (select auth.uid()))
);
create policy "summaries_update_own" on public.period_summaries for update to authenticated
  using ((select auth.uid()) = teacher_id)
  with check ((select auth.uid()) = teacher_id);
create policy "summaries_delete_own" on public.period_summaries for delete to authenticated using ((select auth.uid()) = teacher_id);

create policy "media_select_own" on public.observation_media for select to authenticated using ((select auth.uid()) = teacher_id);
create policy "media_insert_own" on public.observation_media for insert to authenticated with check (
  (select auth.uid()) = teacher_id and
  exists (select 1 from public.observations o where o.id = observation_id and o.teacher_id = (select auth.uid()))
);
create policy "media_delete_own" on public.observation_media for delete to authenticated using ((select auth.uid()) = teacher_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.groups to authenticated;
grant select, insert, update, delete on public.children to authenticated;
grant select, insert, update, delete on public.observations to authenticated;
grant select, insert, update, delete on public.period_summaries to authenticated;
grant select, insert, delete on public.observation_media to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'child-work',
  'child-work',
  false,
  8388608,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "child_work_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'child-work' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "child_work_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'child-work' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "child_work_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'child-work' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'child-work' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "child_work_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'child-work' and (storage.foldername(name))[1] = (select auth.uid())::text);
