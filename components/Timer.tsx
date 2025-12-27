'use client';

import { useState, useEffect } from 'react';
import { useTimer } from '@/context/TimerContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Play, Square, AlertCircle, Pause } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface TimerProps {
    userId: string;
}

export function Timer({ userId }: TimerProps) {
    const { status, elapsed, startTimer, stopTimer, pauseTimer, resumeTimer } = useTimer();
    const [activityName, setActivityName] = useState('');

    // Format ms to HH:MM:SS
    const formatTime = (ms: number) => {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    };

    const handleStart = () => {
        if (!activityName.trim()) return;
        startTimer(activityName);
    };

    const handleStop = () => {
        stopTimer('completed');
        setActivityName('');
    };

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle className="text-center text-3xl font-mono">
                    {formatTime(elapsed)}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {status === 'running' ? (
                    <div className="text-center">
                        <p className="text-lg font-medium text-primary animate-pulse">Running</p>
                    </div>
                ) : status === 'paused' ? (
                    <div className="text-center">
                        <p className="text-lg font-medium text-yellow-500">Paused (Sleep Detected)</p>
                    </div>
                ) : (
                    <Input
                        placeholder="What are you working on?"
                        value={activityName}
                        onChange={(e) => setActivityName(e.target.value)}
                    />
                )}
            </CardContent>
            <CardFooter className="flex justify-center space-x-4">
                {status === 'running' ? (
                    <>
                        <Button variant="outline" size="lg" onClick={() => pauseTimer()} className="w-1/2">
                            <Pause className="mr-2 h-4 w-4" /> Pause
                        </Button>
                        <Button variant="destructive" size="lg" onClick={handleStop} className="w-1/2">
                            <Square className="mr-2 h-4 w-4" /> Stop
                        </Button>
                    </>
                ) : status === 'paused' ? (
                    <Button size="lg" onClick={() => resumeTimer()} className="w-full">
                        <Play className="mr-2 h-4 w-4" /> Resume
                    </Button>
                ) : (
                    <Button size="lg" onClick={handleStart} disabled={!activityName.trim()} className="w-full">
                        <Play className="mr-2 h-4 w-4" /> Start
                    </Button>
                )}
            </CardFooter>
            {status === 'aborted' && (
                <div className="px-6 pb-4 text-center text-destructive text-sm flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 mr-1" /> Timer aborted unexpectedly.
                </div>
            )}
        </Card>
    );
}
