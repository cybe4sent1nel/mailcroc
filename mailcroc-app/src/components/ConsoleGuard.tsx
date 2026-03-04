"use client";

import { useEffect } from 'react';
import { initConsoleProtection } from '@/lib/console-guard';

/**
 * Client-side component that initializes console protection on mount.
 * Drop this into layout.tsx to activate production console guards.
 */
export default function ConsoleGuard() {
    useEffect(() => {
        initConsoleProtection();
    }, []);

    return null; // Renders nothing
}
