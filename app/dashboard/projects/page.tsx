'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Project } from '@/types/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter
} from '@/components/ui/card';
import { Loader2, Plus, Folder, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [newProjectName, setNewProjectName] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProjects(data || []);
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const createProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;

        setCreating(true);
        try {
            const { data, error } = await supabase
                .from('projects')
                .insert([{
                    name: newProjectName,
                    user_id: (await supabase.auth.getUser()).data.user?.id
                }])
                .select()
                .single();

            if (error) throw error;

            setProjects([data, ...projects]);
            setNewProjectName('');
        } catch (error) {
            console.error('Error creating project:', error);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="sm">← Back</Button>
                    </Link>
                    <h1 className="text-2xl font-bold">Projects</h1>
                </div>
            </div>

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Create New Project</CardTitle>
                    <CardDescription>Start managing a new set of objectives</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={createProject} className="flex gap-4">
                        <div className="flex-1">
                            <Label htmlFor="projectName" className="sr-only">Project Name</Label>
                            <Input
                                id="projectName"
                                placeholder="Project Name (e.g. Activity Tracker v2)"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                            />
                        </div>
                        <Button type="submit" disabled={creating || !newProjectName.trim()}>
                            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Create
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {loading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {projects.map((project) => (
                        <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="flex items-center gap-2">
                                            <Folder className="h-5 w-5 text-blue-500" />
                                            {project.name}
                                        </CardTitle>
                                        {/* Status badge could go here */}
                                    </div>
                                    <CardDescription>{project.description || 'No description'}</CardDescription>
                                </CardHeader>
                                <CardFooter>
                                    <Button variant="ghost" className="w-full justify-between">
                                        View Objectives <ArrowRight className="h-4 w-4 ml-2" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        </Link>
                    ))}

                    {projects.length === 0 && (
                        <div className="col-span-2 text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                            No projects yet. Create one to get started!
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
