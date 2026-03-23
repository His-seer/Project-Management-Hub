import { NextRequest } from 'next/server';
import { streamAiResponse } from '@/lib/aiClient';

export async function POST(req: NextRequest) {
  const { stakeholders, projectName, projectDescription, model } = await req.json();
  if (!stakeholders?.length) return Response.json({ error: 'Stakeholder data is required' }, { status: 400 });

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
