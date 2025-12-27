'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Timer } from '@/components/Timer';
import { EntryForm } from '@/components/EntryForm';
import { EntryList } from '@/components/EntryList';
import { useRouter } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import Link from 'next/link';

export default function DashboardPage() {
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const router = useRouter();

    useEffect(() => {
        const checkUser = async () => {
            // ... existing logic ...
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.warn('No authenticated user found.');
            } else {
                setUserId(user.id);
            }
            setLoading(false);
        };
        checkUser();

        // Auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user?.id || null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [router]);

    const handleEntryAdded = () => {
        setRefreshKey(prev => prev + 1);
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
    }

    if (!userId) {
        return <AuthForm />;
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">Daily Productivity Log</h1>
                    <p className="text-muted-foreground">Track your work and reflection.</p>
                </header>

                <div className="grid gap-4 md:grid-cols-3 mb-8">
                    <section>
                        <Timer userId={userId} />
                    </section>
                    <Link href="/dashboard/projects">
                        <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm h-full flex flex-col justify-center items-center hover:bg-accent/50 transition-colors cursor-pointer group">
                            <h3 className="text-lg font-semibold mb-2 group-hover:text-primary">Manage Projects</h3>
                            <p className="text-sm text-muted-foreground text-center">Set objectives and track progress</p>
                        </div>
                    </Link>
                    <Link href="/dashboard/summary">
                        <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm h-full flex flex-col justify-center items-center hover:bg-accent/50 transition-colors cursor-pointer group">
                            <h3 className="text-lg font-semibold mb-2 group-hover:text-primary">View Summary</h3>
                            <p className="text-sm text-muted-foreground text-center">Weekly & Monthly Insights</p>
                        </div>
                    </Link>
                </div>

                <div className="grid gap-8 md:grid-cols-2">
                    <section>
                        <h2 className="text-xl font-semibold mb-4">New Entry</h2>
                        <EntryForm userId={userId} onEntryAdded={handleEntryAdded} />
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">Today's Entries</h2>
                        <EntryList userId={userId} refreshKey={refreshKey} />
                    </section>
                </div>
            </div>
        </div>
    );
}
