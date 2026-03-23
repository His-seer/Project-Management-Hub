import { NextRequest } from 'next/server';
import { streamAiResponse } from '@/lib/aiClient';

export async function POST(req: NextRequest) {
  const { changeRequest, project, model } = await req.json();
  if (!changeRequest) return Response.json({ error: 'Change request data is required' }, { status: 400 });

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
