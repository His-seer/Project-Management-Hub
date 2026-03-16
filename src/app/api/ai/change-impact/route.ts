import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 500 });

  const { changeRequest, project } = await req.json();
  if (!changeRequest) return Response.json({ error: 'Change request data is required' }, { status: 400 });

  const client = new Anthropic({ apiKey });

  const context = `
PROJECT: ${project?.meta?.name || 'Unknown'}
BUDGET: $${project?.funding?.totalBudget?.toLocaleString() ?? 'Not set'}
MILESTONES: ${(project?.plan?.milestones ?? []).map((m: { name: string; dueDate: string }) => `${m.name} (${m.dueDate})`).join(', ') || 'None'}
OPEN RISKS: ${(project?.risks ?? []).filter((r: { status: string }) => r.status !== 'closed').length}
TEAM SIZE: ${project?.resources?.length ?? 0}`.trim();

  const systemPrompt = `You are a senior change management analyst. Assess the impact of a proposed change request on a project. Be specific about schedule, cost, quality, and risk implications. Return ONLY valid JSON.`;

  const userPrompt = `Assess this change request's impact:

${context}

CHANGE REQUEST:
- Name: ${changeRequest.name}
- Description: ${changeRequest.description}
- Reason: ${changeRequest.reason}
- Priority: ${changeRequest.priority}
- Requested By: ${changeRequest.requestedBy}

Return ONLY a JSON object:
{
  "impactOnDeliverables": "How this change affects current deliverables and scope (2-3 sentences)",
  "costEvaluation": "Estimated cost impact with reasoning (1-2 sentences)",
  "riskEvaluation": "New risks introduced or existing risks affected (2-3 sentences)",
  "qualityEvaluation": "Impact on quality standards and testing (1-2 sentences)",
  "durationImpact": "Estimated schedule impact in days/weeks (1-2 sentences)",
  "recommendation": "Accept, defer, or reject — with brief justification (1-2 sentences)"
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
