'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Check, Copy, Loader2 } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ShareButtonProps {
    projectId: string;
    projectName: string;
}

export function ShareButton({ projectId, projectName }: ShareButtonProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [link, setLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const generateLink = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Check for existing link for this PROJECT
            const { data: existing } = await supabase
                .from('share_links')
                .select('token')
                .eq('user_id', user.id)
                .eq('project_id', projectId) // Project-specific check
                .single();

            let token = existing?.token;

            if (!token) {
                // Create new token linked to project
                const newToken = crypto.randomUUID();
                const { error } = await supabase
                    .from('share_links')
                    .insert({
                        user_id: user.id,
                        project_id: projectId,
                        token: newToken
                    });

                if (error) throw error;
                token = newToken;
            }

            const origin = window.location.origin;
            setLink(`${origin}/share/${token}`);

        } catch (error) {
            console.error('Error generating link:', error);
            setLink("Error generating link");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (link && !link.startsWith("Error")) {
            navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (val && !link) generateLink(); // Auto-generate when opened
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Project
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share {projectName}</DialogTitle>
                    <DialogDescription>
                        Anyone with this link can view the progress and activity for this project.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2 mt-4">
                    <div className="grid flex-1 gap-2">
                        <Label htmlFor="link" className="sr-only">
                            Link
                        </Label>
                        <Input
                            id="link"
                            value={loading ? "Generating..." : (link || "")}
                            readOnly
                        />
                    </div>
                    <Button type="button" size="sm" className="px-3" onClick={copyToClipboard} disabled={!link || loading}>
                        {copied ? (
                            <Check className="h-4 w-4" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                        <span className="sr-only">Copy</span>
                    </Button>
                </div>
                {loading && (
                    <div className="flex justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
