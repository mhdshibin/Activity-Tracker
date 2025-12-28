-- Create 'user_settings' table
create table user_settings (
  user_id uuid references auth.users(id) not null primary key,
  theme_preference text check (theme_preference in ('light', 'dark', 'system')) default 'system',
  updated_at timestamptz default now() not null
);

alter table user_settings enable row level security;

create policy "Users can view their own settings"
  on user_settings for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own settings"
  on user_settings for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own settings"
  on user_settings for update to authenticated
  using (auth.uid() = user_id);
