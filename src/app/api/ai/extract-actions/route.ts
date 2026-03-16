import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 500 });

  const { notes, attendees, title } = await req.json();
  if (!notes) return Response.json({ error: 'Meeting notes are required' }, { status: 400 });

  const client = new Anthropic({ apiKey });

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

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      thinking: { type: 'adaptive' },
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err instanceof Error ? err.message : 'Stream error' })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return Response.json({ error: 'Invalid API key.' }, { status: 401 });
    if (err instanceof Anthropic.RateLimitError) return Response.json({ error: 'Rate limit reached.' }, { status: 429 });
    return Response.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
