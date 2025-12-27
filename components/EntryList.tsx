'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { startOfDay, endOfDay } from 'date-fns'; // We'll assume date-fns is installed as per plan

interface Entry {
    id: string;
    content: string;
    mood: string | null;
    created_at: string;
}

interface EntryListProps {
    userId: string;
    refreshKey: number;
}

export function EntryList({ userId, refreshKey }: EntryListProps) {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEntries = useCallback(async () => {
        setLoading(true);
        const todayStart = startOfDay(new Date()).toISOString();
        const todayEnd = endOfDay(new Date()).toISOString();

        const { data, error } = await supabase
            .from('entries')
            .select('*')
            .eq('user_id', userId)
            .gte('created_at', todayStart)
            .lte('created_at', todayEnd)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching entries:', error);
        } else {
            setEntries(data || []);
        }
        setLoading(false);
    }, [userId]);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries, refreshKey]);

    if (loading) {
        return <div className="text-center text-sm text-muted-foreground p-4">Loading entries...</div>;
    }

    if (entries.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                    No entries for today yet.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {entries.map((entry) => (
                <Card key={entry.id}>
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-medium leading-none">{entry.content}</p>
                            <span className="text-xs text-muted-foreground">
                                {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        {entry.mood && (
                            <p className="mt-2 text-xs text-muted-foreground">Mood: {entry.mood}</p>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
