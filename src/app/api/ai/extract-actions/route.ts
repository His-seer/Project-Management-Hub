import { NextRequest } from 'next/server';
import { streamAiResponse } from '@/lib/aiClient';

export async function POST(req: NextRequest) {
  const { notes, attendees, title, model } = await req.json();
  if (!notes) return Response.json({ error: 'Meeting notes are required' }, { status: 400 });

  const systemPrompt = `You are an expert meeting analyst. Extract decisions made and action items from meeting notes. Be precise about owners and deadlines. Only extract what is explicitly or strongly implied in the notes — do not invent actions. Return ONLY valid JSON.`;

  const userPrompt = `Extract decisions and action items from these meeting notes:

MEETING: ${title || 'Untitled'}
ATTENDEES: ${(attendees ?? []).join(', ') || 'Unknown'}

NOTES:
${notes}

Return ONLY a JSON object:
{
  "decisions": [
    { "decision": "What was decided", "madeBy": "Who made it (from attendees if possible)" }
  ],
  "actionItems": [
    { "description": "What needs to be done", "owner": "Who should do it", "dueDate": "YYYY-MM-DD or empty string if not mentioned", "status": "open" }
  ]
}

If no decisions or actions are found, return empty arrays. Do not fabricate items.`;

  const SSE_HEADERS = { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' };

  try {
    const rawStream = await streamAiResponse({
      model: model || 'gemini-2.5-flash',
      systemPrompt,
      userMessage: userPrompt,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const reader = rawStream.getReader();
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err instanceof Error ? err.message : 'Stream error' })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, { headers: SSE_HEADERS });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
