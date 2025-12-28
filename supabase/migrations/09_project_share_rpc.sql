-- RPC to fetch public data for a SPECIFIC PROJECT based on token
create or replace function get_public_project_summary(
  token_input text
)
returns json
language plpgsql
security definer
as $$
declare
  target_project_id uuid;
  target_user_id uuid;
  result json;
begin
  -- 1. Validate Token & Get Context
  select project_id, user_id into target_project_id, target_user_id
  from share_links
  where token = token_input;

  if target_project_id is null then
    return null; -- Invalid token or Global token (not supported for project view)
  end if;

  -- 2. Fetch Data
  select json_build_object(
    'project', (
      select json_build_object(
        'name', name,
        'description', description,
        'status', status,
        'created_at', created_at
      )
      from projects
      where id = target_project_id
    ),
    'objectives', (
       select coalesce(json_agg(o order by created_at), '[]'::json)
       from objectives o
       where o.project_id = target_project_id
    ),
    'work_logs', (
      select coalesce(json_agg(wl order by start_time desc), '[]'::json)
      from work_logs wl
      where wl.project_id = target_project_id
      -- Optional: limit to last 30 days or similar? For now, return all.
    ),
    'user_info', (
      select json_build_object(
        'email', split_part(email, '@', 1)
      )
      from auth.users
      where id = target_user_id
    )
  ) into result;

  return result;
end;
$$;
