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

        const now = new Date();
        const { data, error } = await supabase
            .from('work_logs')
            .insert({
                user_id: userId,
                activity_name: activityName,
                start_time: now.toISOString(),
                status: 'running',
                last_heartbeat: now.toISOString(),
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
        if (status !== 'running' || !logId) return;

        heartbeatRef.current = setInterval(async () => {
            await supabase
                .from('work_logs')
                .update({ last_heartbeat: new Date().toISOString() })
                .eq('id', logId);
        }, HEARTBEAT_INTERVAL);

        return () => {
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        };
    }, [status, logId]);

    // Main Tick & Failsafes Loop
    useEffect(() => {
        if (status !== 'running') return;

        tickRef.current = setInterval(() => {
            const now = Date.now();
            const delta = now - lastTickRef.current;

            // Failsafe 1: Sleep Detection (if tick took longer than expected + threshold)
            if (delta > 1000 + SLEEP_THRESHOLD) {
                console.warn('Sleep detected, stopping timer.');
                stopTimer('aborted');
                return;
            }

            // Failsafe 3: Hard Cap (8h)
            if (startTime && (now - startTime > MAX_DURATION)) {
                console.warn('Max duration exceeded, stopping timer.');
                stopTimer('completed');
                return;
            }

            setElapsed(prev => prev + 1000);
            lastTickRef.current = now;
        }, 1000);

        return () => {
            if (tickRef.current) clearInterval(tickRef.current);
        };
    }, [status, startTime, stopTimer]);

    // Failsafe 2: Visibility Change
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && status === 'running') {
                console.warn('Tab hidden, stopping timer.');
                stopTimer('aborted');
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [status, stopTimer]);

    return {
        status,
        elapsed, // in ms
        startTimer,
        stopTimer,
    };
}
