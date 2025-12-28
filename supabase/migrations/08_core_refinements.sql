-- Add project_id to work_logs
alter table work_logs
add column project_id uuid references projects(id) on delete set null;

-- Add project_id to share_links
alter table share_links
add column project_id uuid references projects(id) on delete cascade;

-- Remove the unique constraint on token if we want one token per project per user?
-- No, token should still be unique globally. 
-- But a user can now have multiple share links (one per project).
-- The previous schema had `token` as unique, which is fine.
-- We might want to ensure a user+project combo is unique in share_links?
alter table share_links
add constraint unique_user_project unique (user_id, project_id);
-- Note: project_id can be null for the "Global" share if we kept it, 
-- but we are moving to project-only sharing. 
-- For now, let's just allow multiple rows.

-- Index for performance
create index idx_work_logs_project_id on work_logs(project_id);
create index idx_share_links_project_id on share_links(project_id);
