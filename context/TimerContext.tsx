'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useProductivityTimer, TimerStatus } from '@/hooks/useProductivityTimer';
import { supabase } from '@/utils/supabase/client';

interface TimerContextType {
    status: TimerStatus;
    elapsed: number;
    startTimer: (activityName: string) => Promise<void>;
    stopTimer: (finalStatus: 'completed' | 'aborted') => Promise<void>;
    pauseTimer: () => Promise<void>;
    resumeTimer: () => Promise<void>;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: React.ReactNode }) {
    const [userId, setUserId] = useState<string | undefined>(undefined);

    useEffect(() => {
        const getAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);
        };
        getAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user?.id);
        });

        return () => subscription.unsubscribe();
    }, []);

    const timer = useProductivityTimer({ userId });

    return (
        <TimerContext.Provider value={timer}>
            {children}
        </TimerContext.Provider>
    );
}

export function useTimer() {
    const context = useContext(TimerContext);
    if (context === undefined) {
        throw new Error('useTimer must be used within a TimerProvider');
    }
    return context;
}
