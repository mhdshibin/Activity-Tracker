'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, parseISO, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type ViewMode = 'week' | 'month';

interface WorkLog {
    id: string;
    activity_name: string;
    start_time: string;
    end_time: string | null;
    status: string;
    paused_duration: number | null;
}

interface Entry {
    id: string;
    content: string;
    description: string | null;
    mood: string | null;
    created_at: string;
}

export default function SummaryPage() {
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [logs, setLogs] = useState<WorkLog[]>([]);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [viewMode, currentDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            let start, end;
            if (viewMode === 'week') {
                start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
                end = endOfWeek(currentDate, { weekStartsOn: 1 });
            } else {
                start = startOfMonth(currentDate);
                end = endOfMonth(currentDate);
            }

            const { data: logsData, error: logsError } = await supabase
                .from('work_logs')
                .select('*')
                .gte('start_time', start.toISOString())
                .lte('start_time', end.toISOString())
                .order('start_time', { ascending: true });

            if (logsError) throw logsError;

            const { data: entriesData, error: entriesError } = await supabase
                .from('entries')
                .select('*')
                .gte('created_at', start.toISOString())
                .lte('created_at', end.toISOString())
                .order('created_at', { ascending: true });

            if (entriesError) throw entriesError;

            setLogs(logsData || []);
            setEntries(entriesData || []);

        } catch (error) {
            console.error('Error fetching summary data:', error);
        } finally {
            setLoading(false);
        }
    };

    const navigateDate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        } else {
            newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        }
        setCurrentDate(newDate);
    };

    // Aggregations
    const totalHours = logs.reduce((acc, log) => {
        if (!log.end_time) return acc;
        const start = new Date(log.start_time).getTime();
        const end = new Date(log.end_time).getTime();
        const paused = log.paused_duration || 0; // ms

        // Ensure we don't get negative time if data is weird
        const duration = Math.max(0, (end - start) - paused);

        return acc + duration;
    }, 0) / (1000 * 60 * 60);

    const completedTasks = logs.filter(l => l.status === 'completed').length;

    // Group logs by Activity Name for distribution
    const activityDistribution = logs.reduce((acc, log) => {
        const name = log.activity_name || 'Unknown';
        if (!log.end_time) return acc;

        const start = new Date(log.start_time).getTime();
        const end = new Date(log.end_time).getTime();
        const paused = log.paused_duration || 0; // ms

        const duration = Math.max(0, (end - start) - paused) / (1000 * 60 * 60);

        acc[name] = (acc[name] || 0) + duration;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="min-h-screen bg-background text-foreground p-6 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header & Controls */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <Link href="/dashboard">
                            <Button variant="ghost" size="sm" className="mb-2 pl-0 hover:pl-2 transition-all text-muted-foreground hover:text-foreground">
                                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
                            </Button>
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight">Productivity Summary</h1>
                        <p className="text-muted-foreground">Weekly and monthly insights.</p>
                    </div>

                    <div className="flex items-center gap-2 bg-card border rounded-lg p-1">
                        <Button
                            variant={viewMode === 'week' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('week')}
                        >
                            Weekly
                        </Button>
                        <Button
                            variant={viewMode === 'month' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('month')}
                        >
                            Monthly
                        </Button>
                    </div>
                </div>

                {/* Date Navigation */}
                <div className="flex items-center justify-between bg-card p-4 rounded-lg border">
                    <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>Previous</Button>
                    <div className="flex items-center gap-2 font-semibold">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        {viewMode === 'week' ? (
                            <span>
                                {format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} - {format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}
                            </span>
                        ) : (
                            <span>{format(currentDate, 'MMMM yyyy')}</span>
                        )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>Next</Button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* High-level Stats */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Focus Time</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {Math.floor(totalHours)}h {Math.round((totalHours % 1) * 60)}m
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Tasks Completed</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{completedTasks}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Journal Entries</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{entries.length}</div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Activity Breakdown */}
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card className="md:col-span-1">
                                <CardHeader>
                                    <CardTitle>Activity Breakdown</CardTitle>
                                    <CardDescription>Where your time went</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {Object.entries(activityDistribution)
                                            .sort(([, a], [, b]) => b - a)
                                            .map(([activity, hours]) => (
                                                <div key={activity} className="flex items-center justify-between">
                                                    <span className="text-sm font-medium truncate w-1/2">{activity}</span>
                                                    <div className="flex items-center gap-2 w-1/2 justify-end">
                                                        <div className="h-2 bg-secondary rounded-full w-24 overflow-hidden">
                                                            <div
                                                                className="h-full bg-primary"
                                                                style={{ width: `${(hours / totalHours) * 100}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-muted-foreground w-16 text-right">
                                                            {Math.floor(hours)}h {Math.round((hours % 1) * 60)}m
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        {Object.keys(activityDistribution).length === 0 && (
                                            <p className="text-sm text-muted-foreground">No activities recorded in this period.</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="md:col-span-1">
                                <CardHeader>
                                    <CardTitle>Journal Log</CardTitle>
                                    <CardDescription>Your daily reflections</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                                        {entries.map((entry) => (
                                            <div key={entry.id} className="border-b last:border-0 pb-3 last:pb-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-xs font-semibold text-muted-foreground">
                                                        {format(parseISO(entry.created_at), 'MMM d, h:mm a')}
                                                    </span>
                                                    {entry.mood && (
                                                        <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                                                            {entry.mood}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm font-medium">{entry.content}</p>
                                                {entry.description && (
                                                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{entry.description}</p>
                                                )}
                                            </div>
                                        ))}
                                        {entries.length === 0 && (
                                            <p className="text-sm text-muted-foreground">No journal entries found.</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
