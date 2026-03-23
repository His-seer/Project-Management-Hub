import { NextRequest } from 'next/server';
import { chatWithTools } from '@/lib/aiChatClient';
import type { ChatMessage, ChatStreamEvent } from '@/types/chat';

export async function POST(req: NextRequest) {
  const { projectId, messages, model } = (await req.json()) as {
    projectId: string;
    messages: ChatMessage[];
    model?: string;
  };

  if (!projectId) return Response.json({ error: 'projectId is required' }, { status: 400 });
  if (!messages?.length) return Response.json({ error: 'messages are required' }, { status: 400 });

  const encoder = new TextEncoder();

  function sendEvent(event: ChatStreamEvent): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
  }

  const readable = new ReadableStream({
    async start(controller) {
      try {
        await chatWithTools(projectId, messages, model || 'gemini-2.5-flash', {
          onText: (text) => {
            controller.enqueue(sendEvent({ type: 'text', content: text }));
          },
          onToolStart: (name, args) => {
            controller.enqueue(sendEvent({ type: 'tool_start', name, args }));
          },
          onToolResult: (name, result) => {
            controller.enqueue(sendEvent({ type: 'tool_result', name, result }));
          },
          onMutations: (modules) => {
            controller.enqueue(sendEvent({ type: 'mutations', modules }));
          },
          onError: (error) => {
            controller.enqueue(sendEvent({ type: 'error', error }));
          },
          onAgentSelected: (agent) => {
            controller.enqueue(sendEvent({ type: 'agent_selected', agent }));
          },
        });
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        controller.enqueue(
          sendEvent({ type: 'error', error: err instanceof Error ? err.message : 'Unknown error' })
        );
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
