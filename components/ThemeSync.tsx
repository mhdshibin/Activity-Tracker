'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { supabase } from '@/utils/supabase/client';

export function ThemeSync() {
    const { theme, setTheme } = useTheme();
    const isMounted = useRef(false);
    const lastSavedTheme = useRef<string | null>(null);

    useEffect(() => {
        const syncTheme = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch saved preference on mount
            if (!isMounted.current) {
                const { data } = await supabase
                    .from('user_settings')
                    .select('theme_preference')
                    .eq('user_id', user.id)
                    .single();

                if (data?.theme_preference) {
                    setTheme(data.theme_preference);
                    lastSavedTheme.current = data.theme_preference;
                }
                isMounted.current = true;
                return;
            }

            // 2. Save changes to DB
            // Only save if it's different from what we last saved (avoids loops)
            if (theme && theme !== lastSavedTheme.current) {
                try {
                    const { error } = await supabase
                        .from('user_settings')
                        .upsert({
                            user_id: user.id,
                            theme_preference: theme,
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'user_id' });

                    if (!error) {
                        lastSavedTheme.current = theme;
                    }
                } catch (err) {
                    console.error('Failed to sync theme:', err);
                }
            }
        };

        syncTheme();
    }, [theme, setTheme]);

    return null; // This component renders nothing
}
