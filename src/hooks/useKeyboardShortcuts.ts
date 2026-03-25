'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUiStore } from '@/stores/useUiStore';

/**
 * Global keyboard shortcuts.
 * Cmd/Ctrl+K: Command palette (handled by CommandPalette itself)
 * Shift+N: New project
 * Shift+D: Dashboard
 * Shift+L: Learning Hub
 * Shift+C: Toggle chat
 * Shift+T: Toggle theme
 */
export function useKeyboardShortcuts() {
  const router = useRouter();
  const { toggleChat, toggleTheme } = useUiStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      if (e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
        switch (e.key) {
          case 'N':
            e.preventDefault();
            router.push('/projects/new');
            break;
          case 'D':
            e.preventDefault();
            router.push('/');
            break;
          case 'L':
            e.preventDefault();
            router.push('/learn');
            break;
          case 'C':
            e.preventDefault();
            toggleChat();
            break;
          case 'T':
            e.preventDefault();
            toggleTheme();
            break;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router, toggleChat, toggleTheme]);
}
