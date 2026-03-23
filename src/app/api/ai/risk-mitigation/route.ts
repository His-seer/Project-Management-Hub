import { NextRequest } from 'next/server';
import { streamAiResponse } from '@/lib/aiClient';

export async function POST(req: NextRequest) {
  const { risk, projectName, projectDescription, model } = await req.json();
  if (!risk) {
    return Response.json({ error: 'Risk data is required' }, { status: 400 });
  }

  const systemPrompt = `You are a senior risk management consultant. Given a project risk, suggest a practical mitigation strategy and contingency plan. Be specific, actionable, and concise. Return ONLY valid JSON.`;

  const userPrompt = `Analyse this risk and suggest mitigation:

PROJECT: ${projectName || 'Unknown'}
DESCRIPTION: ${projectDescription || 'N/A'}

RISK:
- Title: ${risk.title}
- Description: ${risk.description}
- Category: ${risk.category}
- Probability: ${risk.probability}/5
- Impact: ${risk.impact}/5
- Severity Score: ${risk.severity}
- Current Status: ${risk.status}

Return ONLY a JSON object:
{
  "mitigationStrategy": "Specific, actionable mitigation steps (2-4 sentences)",
  "contingencyPlan": "What to do if the risk materialises (2-3 sentences)",
  "suggestedOwner": "Role best suited to own this risk (e.g., 'Technical Lead', 'Project Manager')",
  "reasoning": "Brief explanation of why this approach was recommended (1-2 sentences)"
}`;

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
          const msg = err instanceof Error ? err.message : 'Stream error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, { headers: SSE_HEADERS });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
