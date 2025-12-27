-- Add paused_duration column to work_logs to track total time spent paused in milliseconds
alter table work_logs 
add column if not exists paused_duration bigint default 0;
