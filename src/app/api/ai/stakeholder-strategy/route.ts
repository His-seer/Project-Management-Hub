import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 500 });

  const { stakeholders, projectName, projectDescription } = await req.json();
  if (!stakeholders?.length) return Response.json({ error: 'Stakeholder data is required' }, { status: 400 });

  const client = new Anthropic({ apiKey });

  const systemPrompt = `You are a senior stakeholder management consultant. Based on stakeholder analysis data (power/interest grid), recommend engagement strategies. Be practical and actionable. Return ONLY valid JSON.`;

  const stakeholderList = stakeholders.map((s: { name: string; role: string; power: number; interest: number; engagement: string }) =>
    `- ${s.name} (${s.role}): Power=${s.power}/5, Interest=${s.interest}/5, Current engagement=${s.engagement}`
  ).join('\n');

  const userPrompt = `Recommend engagement strategies for these stakeholders:

PROJECT: ${projectName || 'Unknown'}
DESCRIPTION: ${projectDescription || 'N/A'}

STAKEHOLDERS:
${stakeholderList}

Return ONLY a JSON array:
[
  {
    "stakeholderName": "Name",
    "quadrant": "Manage Closely|Keep Satisfied|Keep Informed|Monitor",
    "recommendedEngagement": "supportive|leading|neutral",
    "suggestedActions": "2-3 specific engagement actions",
    "communicationFrequency": "Weekly|Bi-weekly|Monthly|Quarterly"
  }
]`;

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
