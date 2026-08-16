create index if not exists children_group_id_idx on public.children (group_id);
create index if not exists observations_group_id_idx on public.observations (group_id);
create index if not exists observation_media_child_id_idx on public.observation_media (child_id);
create index if not exists observation_media_teacher_id_idx on public.observation_media (teacher_id);
