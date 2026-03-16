import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { streamAiResponse } from '@/lib/aiClient';
import type { AiProvider } from '@/stores/useAiStore';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    project,
    provider,
    model,
  }: { project: unknown; provider?: AiProvider; model?: string } = body;

  if (!project) return Response.json({ error: 'Project data is required' }, { status: 400 });

  const proj = project as {
    meta: { name: string; status: string; health: string };
    funding?: { totalBudget?: number };
    plan?: {
      budget?: Array<{ actual: number }>;
      milestones?: Array<{ name: string; dueDate: string; status: string }>;
    };
    risks?: Array<{ status: string; severity: number }>;
    issues?: Array<{ status: string }>;
    actionItems?: Array<{ status: string; dueDate: string }>;
    resources?: unknown[];
    kpis?: Array<{ status: string }>;
  };

  const openRisks = (proj.risks ?? []).filter((r) => r.status !== 'closed');
  const openIssues = (proj.issues ?? []).filter(
    (i) => i.status !== 'closed' && i.status !== 'resolved'
  );
  const overdueActions = (proj.actionItems ?? []).filter(
    (a) =>
      (a.status === 'open' || a.status === 'in-progress') &&
      a.dueDate &&
      new Date(a.dueDate) < new Date()
  );
  const missedMilestones = (proj.plan?.milestones ?? []).filter(
    (m) =>
      m.status === 'missed' ||
      (m.dueDate && new Date(m.dueDate) < new Date() && m.status !== 'completed')
  );

  const systemPrompt = `You are a senior PM advisor. Analyze project data and provide predictive insights — things the PM might not notice. Focus on patterns, risks, and actionable recommendations. Return ONLY valid JSON.`;

  const userPrompt = `Analyze this project and provide up to 5 key insights:

PROJECT: ${proj.meta.name}
STATUS: ${proj.meta.status} | HEALTH: ${proj.meta.health}
BUDGET: $${proj.funding?.totalBudget?.toLocaleString() ?? '0'} total, $${(proj.plan?.budget ?? []).reduce((s, b) => s + (b.actual || 0), 0).toLocaleString()} spent
OPEN RISKS: ${openRisks.length} (${openRisks.filter((r) => r.severity >= 15).length} critical)
OPEN ISSUES: ${openIssues.length} (${(openIssues as Array<{ status: string }>).filter((i) => i.status === 'blocked').length} blocked)
OVERDUE ACTIONS: ${overdueActions.length}
MISSED MILESTONES: ${missedMilestones.length}
TEAM SIZE: ${proj.resources?.length ?? 0}
UPCOMING MILESTONES: ${(proj.plan?.milestones ?? []).filter((m) => m.status !== 'completed' && m.status !== 'missed').slice(0, 3).map((m) => `${m.name} (${m.dueDate})`).join(', ') || 'None'}
KPI HEALTH: ${(proj.kpis ?? []).filter((k) => k.status === 'off-track').length} off-track, ${(proj.kpis ?? []).filter((k) => k.status === 'at-risk').length} at-risk

Return ONLY a JSON object:
{
  "insights": [
    {
      "type": "warning|suggestion|positive",
      "title": "Short headline (5-8 words)",
      "detail": "Explanation and recommendation (2-3 sentences)",
      "module": "risks|issues|plan|budget|resources|kpis|actions",
      "severity": "high|medium|low"
    }
  ]
}

Return 3-5 insights. Prioritize warnings, then suggestions, then positives. Only include genuinely useful observations — no padding.`;

  const SSE_HEADERS = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  };

  // Multi-provider path: provider and model supplied in request body
  if (provider && model) {
    try {
      const rawStream = await streamAiResponse({
        provider,
        model,
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
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (err) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: err instanceof Error ? err.message : 'Stream error' })}\n\n`
              )
            );
            controller.close();
          }
        },
      });

      return new Response(readable, { headers: SSE_HEADERS });
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }

  // Fallback: original Anthropic-only logic (backward compatible)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return Response.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 500 });

  const client = new Anthropic({ apiKey });

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
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: err instanceof Error ? err.message : 'Stream error' })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, { headers: SSE_HEADERS });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError)
      return Response.json({ error: 'Invalid API key.' }, { status: 401 });
    if (err instanceof Anthropic.RateLimitError)
      return Response.json({ error: 'Rate limit reached.' }, { status: 429 });
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
