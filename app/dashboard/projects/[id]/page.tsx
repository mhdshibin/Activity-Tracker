'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Project, Objective } from '@/types/projects';
import { ObjectiveTree } from '@/components/projects/ObjectiveTree';
import { ProgressBar } from '@/components/projects/ProgressBar';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [project, setProject] = useState<Project | null>(null);
    const [objectives, setObjectives] = useState<Objective[]>([]);
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

        } catch (error) {
            console.error('Error fetching project details:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateProgress = () => {
        if (objectives.length === 0) return 0;
        // Simple calculation: total completed / total objectives * 100
        // Could be refined to weigh primary objectives more, but this is standard.
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
            <div className="max-w-5xl mx-auto space-y-6">
                <div>
                    <Link href="/dashboard/projects">
                        <Button variant="ghost" size="sm" className="mb-2 pl-0 hover:pl-2 transition-all text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Projects
                        </Button>
                    </Link>
                    <div className="flex justify-between items-start">
                        <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                        <Button variant="ghost" size="sm" onClick={() => {
                            setNewDesc(project.description || '');
                            setIsEditingDesc(!isEditingDesc);
                        }}>
                            {isEditingDesc ? 'Cancel' : 'Edit Description'}
                        </Button>
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

            {/* Persistent Progress Bar */}
            <ProgressBar progress={progress} label={`${project.name} Progress`} />
        </div>
    );
}
