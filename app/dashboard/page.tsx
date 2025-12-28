'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Timer } from '@/components/Timer';
import { EntryForm } from '@/components/EntryForm';
import { EntryList } from '@/components/EntryList';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
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

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setUserId(null); // Force immediate UI update
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
    }

    if (!userId) {
        return <AuthForm />;
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Minimal Header */}
            <header className="border-b bg-card px-6 py-3 flex justify-between items-center sticky top-0 z-10 h-14">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 bg-primary rounded-full" />
                    <h1 className="text-lg font-bold tracking-tight">Activity Tracker</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground hidden md:inline-block">Welcome back</span>
                    <ThemeToggle />
                    <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
                        Sign Out
                    </Button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-6 grid md:grid-cols-[320px_1fr] gap-6 items-start">

                {/* Left Sidebar: Timer & Navigation */}
                <div className="space-y-6 md:sticky md:top-20">
                    <section className="bg-card rounded-xl border shadow-sm p-1">
                        <Timer userId={userId} />
                    </section>

                    <nav className="grid gap-2">
                        <Link href="/dashboard/projects" className="block">
                            <div className="p-4 rounded-xl border bg-card hover:bg-accent/50 hover:border-primary/50 transition-all cursor-pointer group">
                                <h3 className="font-semibold group-hover:text-primary transition-colors">Projects</h3>
                                <p className="text-xs text-muted-foreground">Manage objectives</p>
                            </div>
                        </Link>
                        <Link href="/dashboard/summary" className="block">
                            <div className="p-4 rounded-xl border bg-card hover:bg-accent/50 hover:border-primary/50 transition-all cursor-pointer group">
                                <h3 className="font-semibold group-hover:text-primary transition-colors">Summary</h3>
                                <p className="text-xs text-muted-foreground">View insights</p>
                            </div>
                        </Link>
                    </nav>
                </div>

                {/* Main Content: Feed */}
                <div className="space-y-6">
                    <section>
                        <EntryForm userId={userId} onEntryAdded={handleEntryAdded} />
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold tracking-tight">Today's Log</h2>
                            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">Live Feed</span>
                        </div>
                        <EntryList userId={userId} refreshKey={refreshKey} />
                    </section>
                </div>
            </main>
        </div>
    );
}
