'use client';

import { useEffect, useRef } from 'react';
import { useUiStore } from '@/stores/useUiStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUiStore((s) => s.theme);
  const hasDetected = useRef(false);

  // Auto-detect system preference on first visit (only if user hasn't toggled before)
  useEffect(() => {
    if (hasDetected.current) return;
    hasDetected.current = true;
    const stored = localStorage.getItem('pm-app-ui');
    if (!stored && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      useUiStore.getState().toggleTheme(); // switches from default 'light' to 'dark'
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return <>{children}</>;
}
