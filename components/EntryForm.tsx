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
    const [isExpanded, setIsExpanded] = useState(false);
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
            setIsExpanded(false); // Collapse on success
            onEntryAdded();
        }
    };

    return (
        <Card className="border-2 border-dashed shadow-none hover:border-primary/20 transition-colors bg-card/50">
            <CardContent className="p-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5 ">
                        {!isExpanded && (
                            <Label htmlFor="content" className="sr-only">Headline</Label>
                        )}
                        <Input
                            id="content"
                            placeholder={isExpanded ? "Checking off the main goal..." : "Checking off the main goal... (Click to expand)"}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onFocus={() => setIsExpanded(true)}
                            className="border-0 shadow-none bg-transparent text-lg font-medium placeholder:text-muted-foreground/50 focus-visible:ring-0 px-0 rounded-none border-b border-transparent focus:border-border transition-colors h-auto py-2"
                        />
                    </div>

                    {isExpanded && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="grid w-full gap-1.5">
                                <Label htmlFor="description" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Add more details about your day..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="min-h-[100px] resize-none"
                                />
                            </div>

                            <div className="flex items-end gap-3 justify-between">
                                <div className="grid w-full max-w-xs gap-1.5">
                                    <Label htmlFor="mood" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mood</Label>
                                    <Input
                                        id="mood"
                                        placeholder="Mood tag"
                                        value={mood}
                                        onChange={(e) => setMood(e.target.value)}
                                        className="h-8"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" size="sm" disabled={isSubmitting || !content.trim()}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Post
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}
