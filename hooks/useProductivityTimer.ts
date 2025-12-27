import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'aborted' | 'completed';

interface UseProductivityTimerProps {
    userId: string | undefined;
}

export function useProductivityTimer({ userId }: UseProductivityTimerProps) {
    const [status, setStatus] = useState<TimerStatus>('idle');
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const [logId, setLogId] = useState<string | null>(null);

    const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
    const tickRef = useRef<NodeJS.Timeout | null>(null);
    const lastTickRef = useRef<number>(Date.now());

    // Constants
    const MAX_DURATION = 8 * 60 * 60 * 1000; // 8 hours in ms
    const HEARTBEAT_INTERVAL = 60000; // 60s
    const SLEEP_THRESHOLD = 3000; // 3s tolerance for sleep detection

    // Restoration Logic
    useEffect(() => {
        if (!userId) return;

        const checkActiveSession = async () => {
            // Find ANY active session (running or paused) based on STATUS
            const { data: activeLog, error } = await supabase
                .from('work_logs')
                .select('*')
                .eq('user_id', userId)
                .in('status', ['running', 'paused'])
                .order('start_time', { ascending: false }) // Get latest if multiple exist (though we try to prevent)
                .limit(1)
                .single();

            if (activeLog) {
                const now = Date.now();
                const lastHeartbeat = new Date(activeLog.last_heartbeat).getTime();
                const diff = now - lastHeartbeat;
                const ONE_MINUTE = 60 * 1000;
                const ONE_HOUR = 60 * 60 * 1000;

                setLogId(activeLog.id);
                setStartTime(new Date(activeLog.start_time).getTime());

                // Logic: Check Status FIRST, then Time Diff
                if (activeLog.status === 'paused') {
                    // Explicitly Paused
                    // Elapsed = (LastHeartbeat - Start) - PausedAmt
                    const start = new Date(activeLog.start_time).getTime();
                    const pausedAmt = activeLog.paused_duration || 0;
                    const currentElapsed = Math.max(0, (lastHeartbeat - start) - pausedAmt);

                    setElapsed(currentElapsed);
                    setStatus('paused');
                } else {
                    // Status is 'running'
                    if (diff > ONE_HOUR) {
                        // Stale session -> Close it
                        console.log('Session stale (>1h), closing.');
                        await supabase
                            .from('work_logs')
                            .update({
                                end_time: activeLog.last_heartbeat,
                                status: 'aborted'
                            })
                            .eq('id', activeLog.id);

                        setLogId(null);
                        setStartTime(null);
                        setStatus('idle');
                        setElapsed(0);
                    }
                    else if (diff > ONE_MINUTE) {
                        // Implicitly Paused (Sleep/Closed Tab while running)
                        console.log('Session sleep detected, restoring as PAUSED.');

                        const start = new Date(activeLog.start_time).getTime();
                        const pausedAmt = activeLog.paused_duration || 0;
                        const currentElapsed = Math.max(0, (lastHeartbeat - start) - pausedAmt);

                        setElapsed(currentElapsed);
                        setStatus('paused');
                    }
                    else {
                        // Active & Recent Heartbeat -> Restore as RUNNING
                        console.log('Session active, restoring as RUNNING.');
                        const start = new Date(activeLog.start_time).getTime();
                        const pausedAmt = activeLog.paused_duration || 0;

                        // Elapsed = (Now - Start) - PausedAmt
                        const currentElapsed = Math.max(0, (now - start) - pausedAmt);

                        setElapsed(currentElapsed);
                        setStatus('running');
                        lastTickRef.current = now;

                        // IMPORTANT: Update heartbeat immediately to prevent staleness drift
                        // otherwise next heartbeat is 60s from now, but DB is already old
                        await supabase
                            .from('work_logs')
                            .update({ last_heartbeat: new Date().toISOString() })
                            .eq('id', activeLog.id);
                    }
                }
            }
        };

        checkActiveSession();
    }, [userId]);

    const stopTimer = useCallback(async (finalStatus: 'completed' | 'aborted') => {
        if (!logId) return;

        setStatus(finalStatus);
        const endTime = new Date().toISOString();

        // Clear intervals
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        if (tickRef.current) clearInterval(tickRef.current);

        // Update DB
        await supabase
            .from('work_logs')
            .update({
                status: finalStatus,
                end_time: endTime,
                last_heartbeat: endTime
            })
            .eq('id', logId);

        setLogId(null);
    }, [logId]);

    const startTimer = useCallback(async (activityName: string) => {
        if (!userId) return;

        // Safety: Ensure no other open sessions exist (Close them if found) by STATUS
        await supabase
            .from('work_logs')
            .update({ end_time: new Date().toISOString(), status: 'aborted' })
            .eq('user_id', userId)
            .in('status', ['running', 'paused']);

        const now = new Date();
        const { data, error } = await supabase
            .from('work_logs')
            .insert({
                user_id: userId,
                activity_name: activityName,
                start_time: now.toISOString(),
                status: 'running',
                last_heartbeat: now.toISOString(),
                paused_duration: 0
            })
            .select()
            .single();

        if (error) {
            console.error('Failed to start timer:', error);
            return;
        }

        setLogId(data.id);
        setStartTime(now.getTime());
        setElapsed(0);
        setStatus('running');
        lastTickRef.current = Date.now();
    }, [userId]);

    // Heartbeat Effect
    useEffect(() => {
        // Only heartbeat if running
        if (status !== 'running' || !logId) return;

        heartbeatRef.current = setInterval(async () => {
            // Check if we still have the session logID valid?
            // Just update heartbeat
            await supabase
                .from('work_logs')
                .update({ last_heartbeat: new Date().toISOString() })
                .eq('id', logId);
        }, HEARTBEAT_INTERVAL);

        return () => {
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        };
    }, [status, logId]);

    const pauseTimer = useCallback(async () => {
        if (!logId) return;

        setStatus('paused');
        // Clear intervals
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        if (tickRef.current) clearInterval(tickRef.current);

        // We DO NOT update end_time here. We leave it NULL.
        // We just update status for UI/Data consistency if desired, 
        // OR we just stop the heartbeat. 
        // User said: "display ... in a paused state".
        // Updating last_heartbeat is good practice so we know when the pause "started" (approx).

        await supabase
            .from('work_logs')
            .update({
                status: 'paused',
                last_heartbeat: new Date().toISOString()
            })
            .eq('id', logId);
    }, [logId]);

    const resumeTimer = useCallback(async () => {
        if (!logId) return;
        setStatus('running');
        lastTickRef.current = Date.now();

        // Calculate gap
        const { data: currentLog } = await supabase
            .from('work_logs')
            .select('last_heartbeat, paused_duration')
            .eq('id', logId)
            .single();

        if (currentLog) {
            const lastHeartbeat = new Date(currentLog.last_heartbeat).getTime();
            const now = Date.now();
            // Gap = Now - LastHeartbeat
            const gap = now - lastHeartbeat;

            const currentPausedDuration = currentLog.paused_duration || 0;
            const newPausedDuration = currentPausedDuration + gap;

            await supabase
                .from('work_logs')
                .update({
                    status: 'running',
                    last_heartbeat: new Date().toISOString(),
                    paused_duration: newPausedDuration
                })
                .eq('id', logId);
        }

    }, [logId]);

    // Main Tick (Local UI update only)
    useEffect(() => {
        if (status !== 'running') return;

        tickRef.current = setInterval(() => {
            const now = Date.now();
            setElapsed(prev => prev + 1000);
            lastTickRef.current = now;
        }, 1000);

        return () => {
            if (tickRef.current) clearInterval(tickRef.current);
        };
    }, [status]);

    return {
        status,
        elapsed, // in ms
        startTimer,
        stopTimer,
        pauseTimer,
        resumeTimer
    };
}
