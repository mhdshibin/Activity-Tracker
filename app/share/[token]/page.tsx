'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/utils/supabase/client';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Link as LinkIcon, CheckCircle2, Circle } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Link from 'next/link';

// Types matching the RPC return structure
interface PublicProjectData {
    project: {
        name: string;
        description: string | null;
        status: string;
        created_at: string;
    };
    objectives: {
        id: string;
        title: string;
        is_completed: boolean;
        parent_id: string | null;
        created_at: string;
    }[];
    work_logs: {
        id: string;
        activity_name: string;
        start_time: string;
        end_time: string | null;
        status: string;
        paused_duration: number | null;
    }[];
    user_info: {
        email: string;
    };
}

export default function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const [data, setData] = useState<PublicProjectData | null>(null);
    const [loading, setLoading] = useState(true);
    const [invalidToken, setInvalidToken] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: rpcData, error } = await supabase.rpc('get_public_project_summary', {
                token_input: token
            });

            if (error) throw error;
            if (!rpcData) {
                setInvalidToken(true);
            } else {
                setData(rpcData as PublicProjectData);
            }
        } catch (error) {
            console.error('Error fetching public project:', error);
            setInvalidToken(true); // Assume invalid if error
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center h-screen items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (invalidToken || !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                <LinkIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h1 className="text-2xl font-bold">Project Not Found</h1>
                <p className="text-muted-foreground mt-2">The shared link is invalid or the project has been removed.</p>
                <Link href="/">
                    <Button className="mt-6">Go Home</Button>
                </Link>
            </div>
        );
    }

    // Helper to calculate progress
    const calculateProgress = () => {
        if (!data.objectives.length) return 0;
        const completed = data.objectives.filter(o => o.is_completed).length;
        return Math.round((completed / data.objectives.length) * 100);
    };

    // Calculate total hours
    const totalHours = data.work_logs.reduce((acc, log) => {
        if (!log.end_time) return acc;
        const start = new Date(log.start_time).getTime();
        const end = new Date(log.end_time).getTime();
        const paused = log.paused_duration || 0;
        return acc + Math.max(0, end - start - paused);
    }, 0) / (1000 * 60 * 60);

    const progress = calculateProgress();

    return (
        <div className="min-h-screen bg-background text-foreground p-6 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                    <div>
                        <div className="text-sm font-medium text-primary mb-1">Project Share</div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">{data.project.name}</h1>
                        <p className="text-muted-foreground max-w-xl">
                            {data.project.description || "No description provided."}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <div className="text-right ml-4">
                            <div className="text-xs text-muted-foreground">Shared by</div>
                            <div className="font-medium">{data.user_info.email.split('@')[0]}</div>
                            {/* Masking email slightly by hiding domain if desired, or just show first part */}
                        </div>
                    </div>
                </div>

                {/* Stats & Progress */}
                <div className="grid gap-6 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Progress</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{progress}%</div>
                            <div className="w-full bg-secondary h-2 rounded-full mt-2 overflow-hidden">
                                <div className="bg-primary h-full transition-all" style={{ width: `${progress}%` }} />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Time</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {Math.floor(totalHours)}h {Math.round((totalHours % 1) * 60)}m
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Objectives</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{data.objectives.length}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {data.objectives.filter(o => o.is_completed).length} completed
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-8 md:grid-cols-3">
                    {/* Objectives List (Read Only) */}
                    <div className="md:col-span-2 space-y-4">
                        <h2 className="text-xl font-semibold">Objectives</h2>
                        <Card>
                            <CardContent className="p-6 space-y-4">
                                {data.objectives.length === 0 ? (
                                    <p className="text-muted-foreground">No objectives listed.</p>
                                ) : (
                                    // Flattened list simpler for read-only view, or we can try to indent
                                    // For now, listing them with completion status is good.
                                    data.objectives
                                        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                                        .map(obj => (
                                            <div key={obj.id} className="flex items-start gap-3 group">
                                                <div className={`mt-0.5 ${obj.is_completed ? "text-green-500" : "text-muted-foreground"}`}>
                                                    {obj.is_completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                                </div>
                                                <div className={`${obj.is_completed ? "text-muted-foreground line-through" : ""}`}>
                                                    {obj.title}
                                                </div>
                                            </div>
                                        ))
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Activity Feed */}
                    <div className="md:col-span-1 space-y-4">
                        <h2 className="text-xl font-semibold">Activity Log</h2>
                        <Card>
                            <CardContent className="p-4 h-[500px] overflow-y-auto space-y-4">
                                {data.work_logs.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">No activity recorded.</p>
                                ) : (
                                    data.work_logs.map(log => {
                                        const start = parseISO(log.start_time);
                                        const end = log.end_time ? parseISO(log.end_time) : null;
                                        const duration = end
                                            ? Math.round((differenceInMinutes(end, start) - (log.paused_duration || 0) / 60000))
                                            : 0;

                                        return (
                                            <div key={log.id} className="border-b last:border-0 pb-3 last:pb-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-sm font-medium truncate w-2/3">{log.activity_name}</span>
                                                    <span className="text-xs text-muted-foreground">{format(start, 'MMM d')}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${log.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                            log.status === 'running' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                'bg-gray-100 text-gray-700 dark:bg-gray-800'
                                                        }`}>
                                                        {log.status}
                                                    </span>
                                                    {log.status === 'completed' && (
                                                        <span className="text-xs font-mono text-muted-foreground">{duration}m</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
