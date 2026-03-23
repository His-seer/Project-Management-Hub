'use client';

import { useUiStore } from '@/stores/useUiStore';
import { useProjectId } from '@/hooks/useCurrentProject';
import { MessageSquare } from 'lucide-react';

export default function ChatToggle() {
  const projectId = useProjectId();
  const chatOpen = useUiStore((s) => s.chatOpen);
  const toggleChat = useUiStore((s) => s.toggleChat);

  if (chatOpen || !projectId) return null;

  return (
    <button
      onClick={toggleChat}
      className="fixed bottom-6 right-6 z-40 p-3.5 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all hover:scale-105 active:scale-95"
      title="Open AI Co-Pilot"
    >
      <MessageSquare size={22} />
    </button>
  );
}
