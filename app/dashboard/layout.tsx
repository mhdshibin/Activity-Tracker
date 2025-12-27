'use client';

import { TimerProvider } from '@/context/TimerContext';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <TimerProvider>
            {children}
        </TimerProvider>
    );
}
