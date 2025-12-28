'use client';

import { ShareButton } from '@/components/ShareButton'; // Import ShareButton
import { differenceInMinutes, format, parseISO } from 'date-fns'; // Import date utils
import { useState, useEffect, use } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ObjectiveTree } from '@/components/projects/ObjectiveTree';
import { ProgressBar } from '@/components/projects/ProgressBar';

// ... (previous imports)

interface Project {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    user_id: string;
}

interface Objective {
    id: string;
    project_id: string;
    parent_id: string | null;
    title: string;
    is_completed: boolean;
    created_at: string;
}

interface WorkLog {
    id: string;
    activity_name: string;
    start_time: string;
    end_time: string | null;
    status: string;
    paused_duration: number | null;
}

export default function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [project, setProject] = useState<Project | null>(null);
    const [objectives, setObjectives] = useState<Objective[]>([]);
    const [logs, setLogs] = useState<WorkLog[]>([]); // State for activity logs
    const [loading, setLoading] = useState(true);
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [newDesc, setNewDesc] = useState('');

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            // Fetch Project
            const { data: projectData, error: projectError } = await supabase
                .from('projects')
                .select('*')
                .eq('id', id)
                .single();

            if (projectError) throw projectError;
            setProject(projectData);

            // Fetch Objectives
            const { data: objectivesData, error: objectivesError } = await supabase
                .from('objectives')
                .select('*')
                .eq('project_id', id)
                .order('created_at', { ascending: true });

            if (objectivesError) throw objectivesError;
            setObjectives(objectivesData || []);

            // Fetch Work Logs (Activity History) - Project Specific
            const { data: logsData, error: logsError } = await supabase
                .from('work_logs')
                .select('*')
                .eq('project_id', id)
                .order('start_time', { ascending: false });

            if (logsError) throw logsError;
            setLogs(logsData || []);

        } catch (error) {
            console.error('Error fetching project details:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateProgress = () => {
        if (objectives.length === 0) return 0;
        const completedCount = objectives.filter(o => o.is_completed).length;
        return (completedCount / objectives.length) * 100;
    };

    if (loading) {
        return <div className="flex justify-center h-screen items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!project) {
        return <div className="p-8 text-center">Project not found.</div>;
    }

    const progress = calculateProgress();

    const saveDescription = async () => {
        if (!project) return;
        try {
            const { error } = await supabase
                .from('projects')
                .update({ description: newDesc })
                .eq('id', project.id);

            if (error) throw error;
            setProject({ ...project, description: newDesc });
            setIsEditingDesc(false);
        } catch (error) {
            console.error('Error updating description:', error);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-6 md:p-8 pb-32">
            <div className="max-w-5xl mx-auto space-y-8">
                <div>
                    <Link href="/dashboard/projects">
                        <Button variant="ghost" size="sm" className="mb-2 pl-0 hover:pl-2 transition-all text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Projects
                        </Button>
                    </Link>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                        <div className="flex items-center gap-2">
                            {/* Share Button Here */}
                            <ShareButton projectId={project.id} projectName={project.name} />
                            <ThemeToggle />
                            <Button variant="ghost" size="sm" onClick={() => {
                                setNewDesc(project.description || '');
                                setIsEditingDesc(!isEditingDesc);
                            }}>
                                {isEditingDesc ? 'Cancel' : 'Edit Description'}
                            </Button>
                        </div>
                    </div>

                    {isEditingDesc ? (
                        <div className="mt-2 space-y-2 max-w-2xl">
                            <textarea
                                className="w-full p-2 rounded border bg-background text-sm focus:ring-1 focus:ring-primary outline-none"
                                rows={3}
                                value={newDesc}
                                onChange={(e) => setNewDesc(e.target.value)}
                                placeholder="Add a description..."
                            />
                            <div className="flex justify-end gap-2">
                                <Button size="sm" onClick={saveDescription}>Save Description</Button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-muted-foreground mt-1 cursor-pointer hover:text-foreground transition-colors max-w-2xl" onClick={() => {
                            setNewDesc(project.description || '');
                            setIsEditingDesc(true);
                        }}>
                            {project.description || 'No description provided. Click to add one.'}
                        </p>
                    )}
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Objectives Column (Takes 2/3 space) */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-card rounded-lg border p-6 shadow-sm min-h-[500px]">
                            <h2 className="text-xl font-semibold mb-6">Objectives</h2>
                            <ObjectiveTree
                                objectives={objectives}
                                parentId={null}
                                projectId={id}
                                onUpdate={fetchData}
                            />
                        </div>
                    </div>

                    {/* Activity History Column (Takes 1/3 space) */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-card rounded-lg border p-6 shadow-sm h-full max-h-[600px] overflow-y-auto">
                            <h2 className="text-xl font-semibold mb-4">Activity History</h2>
                            <div className="space-y-4">
                                {logs.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">No timer logs recorded for this project yet.</p>
                                ) : (
                                    logs.map(log => {
                                        const start = parseISO(log.start_time);
                                        const end = log.end_time ? parseISO(log.end_time) : null;
                                        const duration = end
                                            ? Math.round((differenceInMinutes(end, start) - (log.paused_duration || 0) / 60000))
                                            : 0;

                                        return (
                                            <div key={log.id} className="border-b last:border-0 pb-3 last:pb-0">
                                                <div className="flex justify-between items-start">
                                                    <span className="text-sm font-medium truncate w-2/3">{log.activity_name}</span>
                                                    <span className="text-xs text-muted-foreground">{format(start, 'MMM d')}</span>
                                                </div>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${log.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                                                        log.status === 'running' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                                                            'bg-gray-100 text-gray-700 dark:bg-gray-800'
                                                        }`}>
                                                        {log.status}
                                                    </span>
                                                    {log.status === 'completed' && (
                                                        <span className="text-xs font-mono text-muted-foreground">{duration} min</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Persistent Progress Bar */}
            <ProgressBar progress={progress} label={`${project.name} Progress`} />
        </div>
    );
}
