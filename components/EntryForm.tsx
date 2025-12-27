'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

import { Textarea } from '@/components/ui/textarea';

interface EntryFormProps {
    userId: string;
    onEntryAdded: () => void;
}

export function EntryForm({ userId, onEntryAdded }: EntryFormProps) {
    const [content, setContent] = useState('');
    const [description, setDescription] = useState('');
    const [mood, setMood] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        setIsSubmitting(true);
        const { error } = await supabase
            .from('entries')
            .insert({
                user_id: userId,
                content: content,
                description: description || null,
                mood: mood || null,
            });

        setIsSubmitting(false);

        if (error) {
            console.error('Error adding entry:', error);
            alert('Failed to add entry.');
        } else {
            setContent('');
            setDescription('');
            setMood('');
            onEntryAdded();
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>New Entry</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid w-full gap-1.5">
                        <Label htmlFor="content">Headline / Title</Label>
                        <Input
                            id="content"
                            placeholder="Checking off the main goal..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>

                    <div className="grid w-full gap-1.5">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                            id="description"
                            placeholder="Add more details about your day..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="grid w-full gap-1.5">
                        <Label htmlFor="mood">Mood (Optional)</Label>
                        <Input
                            id="mood"
                            placeholder="e.g., Productive, Tired"
                            value={mood}
                            onChange={(e) => setMood(e.target.value)}
                        />
                    </div>
                    <Button type="submit" disabled={isSubmitting || !content.trim()}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Entry
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
