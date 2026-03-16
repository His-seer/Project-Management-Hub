import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 500 });
  }

  const { risk, projectName, projectDescription } = await req.json();
  if (!risk) {
    return Response.json({ error: 'Risk data is required' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

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

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
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
          const msg = err instanceof Error ? err.message : 'Stream error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
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
