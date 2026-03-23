'use client';

import dynamic from 'next/dynamic';

// Dynamic imports with SSR disabled to avoid getServerSnapshot errors
const ChatPanel = dynamic(() => import('@/components/chat/ChatPanel'), { ssr: false });
const ChatToggle = dynamic(() => import('@/components/chat/ChatToggle'), { ssr: false });
const NotificationCenter = dynamic(() => import('@/components/notifications/NotificationCenter'), { ssr: false });

export default function ClientOverlays() {
  return (
    <>
      <ChatPanel />
      <ChatToggle />
      <NotificationCenter />
    </>
  );
}
