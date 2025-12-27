'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Timer } from '@/components/Timer';
import { EntryForm } from '@/components/EntryForm';
import { EntryList } from '@/components/EntryList';
import { useRouter } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';

export default function DashboardPage() {
    const [userId, setUserId] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const router = useRouter();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                // In a real app we'd redirect to login
                // For this demo, let's just log it or allow "anonymous" if configured, 
                // but user requested Supabase Auth. 
                // We will assume they are logged in or will use a test user.
                // For now, let's create a dummy user ID if auth fails locally to allow testing UI 
                // (OR better: prompt to login).
                // Let's rely on actual auth.
                console.warn('No authenticated user found. Interactions with DB will fail if RLS is on.');
            } else {
                setUserId(user.id);
            }
        };
        checkUser();

        // Auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user?.id || null);
        });

        return () => subscription.unsubscribe();
    }, [router]);

    const handleEntryAdded = () => {
        setRefreshKey(prev => prev + 1);
    };

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

                <section>
                    <Timer userId={userId} />
                </section>

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
