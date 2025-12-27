-- Delete completed/aborted logs where effective duration is less than 60 seconds (60000 ms)
-- We strictly filter for entries that HAVE an end_time to avoid deleting running tasks.
DELETE FROM work_logs
WHERE 
  end_time IS NOT NULL 
  AND (
    (EXTRACT(EPOCH FROM (end_time - start_time)) * 1000) - COALESCE(paused_duration, 0) < 60000
  );
