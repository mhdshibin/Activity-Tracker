-- Create 'projects' table
create table projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  description text,
  status text check (status in ('active', 'completed', 'archived')) default 'active',
  created_at timestamptz default now() not null
);

alter table projects enable row level security;

create policy "Users can view their own projects"
  on projects for select to authenticated using (auth.uid() = user_id);

create policy "Users can insert their own projects"
  on projects for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can update their own projects"
  on projects for update to authenticated using (auth.uid() = user_id);

create policy "Users can delete their own projects"
  on projects for delete to authenticated using (auth.uid() = user_id);

-- Create 'objectives' table
create table objectives (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  parent_id uuid references objectives(id) on delete cascade, -- For nested sub-objectives
  title text not null,
  is_completed boolean default false,
  created_at timestamptz default now() not null
);

alter table objectives enable row level security;

-- Policies for objectives (using project ownership)
create policy "Users can view objectives of their projects"
  on objectives for select to authenticated
  using (exists (select 1 from projects where projects.id = objectives.project_id and projects.user_id = auth.uid()));

create policy "Users can insert objectives to their projects"
  on objectives for insert to authenticated
  with check (exists (select 1 from projects where projects.id = objectives.project_id and projects.user_id = auth.uid()));

create policy "Users can update objectives of their projects"
  on objectives for update to authenticated
  using (exists (select 1 from projects where projects.id = objectives.project_id and projects.user_id = auth.uid()));

create policy "Users can delete objectives of their projects"
  on objectives for delete to authenticated
  using (exists (select 1 from projects where projects.id = objectives.project_id and projects.user_id = auth.uid()));

-- Create 'share_links' table for Public Sharing
create table share_links (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  token text unique not null,
  created_at timestamptz default now() not null,
  expires_at timestamptz, -- Optional expiration
  views int default 0
);

alter table share_links enable row level security;

create policy "Users can manage their share links"
  on share_links for all to authenticated
  using (auth.uid() = user_id);
