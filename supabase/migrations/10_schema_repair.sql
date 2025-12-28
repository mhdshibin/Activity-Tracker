-- Safely add project_id to work_logs if missing
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'work_logs' and column_name = 'project_id') then
    alter table work_logs add column project_id uuid references projects(id) on delete set null;
  end if;
end $$;

-- Safely add project_id to share_links if missing
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'share_links' and column_name = 'project_id') then
    alter table share_links add column project_id uuid references projects(id) on delete cascade;
  end if;
end $$;

-- Safely add unique constraint to share_links if missing
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'unique_user_project') then
    alter table share_links add constraint unique_user_project unique (user_id, project_id);
  end if;
end $$;

-- Ensure indexes exist (Postgres "if not exists" handles this natively for indexes)
create index if not exists idx_work_logs_project_id on work_logs(project_id);
create index if not exists idx_share_links_project_id on share_links(project_id);
