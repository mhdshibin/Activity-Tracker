-- Create a function to fetch summary data for a valid share token
create or replace function get_public_summary(
  token_input text,
  date_start timestamptz,
  date_end timestamptz
)
returns json
language plpgsql
security definer -- Bypasses RLS
as $$
declare
  target_user_id uuid;
  result json;
begin
  -- 1. Validate Token & Get User ID
  select user_id into target_user_id
  from share_links
  where token = token_input;

  if target_user_id is null then
    return null; -- Invalid token
  end if;

  -- 2. Fetch Data
  select json_build_object(
    'work_logs', (
      select coalesce(json_agg(wl), '[]'::json)
      from work_logs wl
      where wl.user_id = target_user_id
      and wl.start_time >= date_start
      and wl.start_time <= date_end
    ),
    'entries', (
      select coalesce(json_agg(e), '[]'::json)
      from entries e
      where e.user_id = target_user_id
      and e.created_at >= date_start
      and e.created_at <= date_end
    ),
    'user_info', (
      select json_build_object(
        'email', split_part(email, '@', 1) -- Only show username part for privacy
      )
      from auth.users
      where id = target_user_id
    )
  ) into result;

  return result;
end;
$$;
