-- Close all currently open sessions to start fresh
UPDATE work_logs
SET 
  end_time = last_heartbeat,
  status = 'completed' -- or 'aborted', but completed is safer for history
WHERE end_time IS NULL;
