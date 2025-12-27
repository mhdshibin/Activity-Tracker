-- Enable RLS
-- alter table auth.users enable row level security; -- (This often requires superuser, usually enabled by default)

-- Create 'entries' table
create table entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  content text not null,
  mood text,
  created_at timestamptz default now() not null
);

alter table entries enable row level security;

create policy "Users can view their own entries"
on entries for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own entries"
on entries for insert
to authenticated
with check (auth.uid() = user_id);

-- Create 'work_logs' table
create table work_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  activity_name text not null,
  start_time timestamptz not null,
  last_heartbeat timestamptz,
  end_time timestamptz,
  status text check (status in ('running', 'completed', 'aborted')) not null,
  
  -- Constraint: end_time - start_time <= 8 hours
  -- Note: This is harder to enforce strictly in SQL w/o functions, but we can try a check if end_time exists.
  -- Alternatively, we enforce this in application logic and RLS/Triggers. 
  -- For simple constraint:
  constraint max_duration_check check (
    end_time is null or (end_time - start_time <= interval '8 hours')
  )
);

alter table work_logs enable row level security;

create policy "Users can view their own work logs"
on work_logs for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own work logs"
on work_logs for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own work logs"
on work_logs for update
to authenticated
using (auth.uid() = user_id);
