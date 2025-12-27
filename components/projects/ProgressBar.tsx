'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ProgressBarProps {
    progress: number; // 0 to 100
    label?: string;
}

export function ProgressBar({ progress, label = 'Overall Progress' }: ProgressBarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 100) {
                setScrolled(true);
                setIsCollapsed(true);
            } else {
                setScrolled(false);
                setIsCollapsed(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div
            className={cn(
                "fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out bg-background border shadow-lg rounded-lg overflow-hidden",
                isCollapsed ? "w-48" : "w-80"
            )}
        >
            <div
                className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold truncate">{label}</h3>
                    {isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>

                <div className="flex items-center gap-2">
                    <Progress value={progress} className="h-2" />
                    <span className="text-xs font-mono text-muted-foreground">{Math.round(progress)}%</span>
                </div>
            </div>
        </div>
    );
}
