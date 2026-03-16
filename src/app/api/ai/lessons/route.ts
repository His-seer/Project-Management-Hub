import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY is not configured. Add it to your .env.local file.' },
      { status: 500 }
    );
  }

  const body = await req.json();
  const { project } = body;

  if (!project) {
    return Response.json({ error: 'Project data is required' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const closedRisks = (project.risks ?? []).filter((r: { status: string }) => r.status === 'closed' || r.status === 'accepted');
  const resolvedIssues = (project.issues ?? []).filter((i: { status: string }) => i.status === 'resolved' || i.status === 'closed');
  const missedMilestones = (project.plan?.milestones ?? []).filter((m: { status: string }) => m.status === 'missed');
  const invalidatedAssumptions = (project.assumptions ?? []).filter((a: { validationStatus: string }) => a.validationStatus === 'invalidated');
  const acceptedChanges = (project.changes?.requests ?? []).filter((c: { status: string }) => c.status === 'accepted');

  const context = `
PROJECT: ${project.meta.name}
STATUS: ${project.meta.status}
DURATION: ${project.meta.startDate} to ${project.meta.targetEndDate}

CLOSED/ACCEPTED RISKS (${closedRisks.length}):
${closedRisks.slice(0, 8).map((r: { title: string; category: string; mitigationStrategy: string }) =>
  `- [${r.category}] ${r.title} — Mitigation used: ${r.mitigationStrategy}`
).join('\n') || 'None'}

RESOLVED ISSUES (${resolvedIssues.length}):
${resolvedIssues.slice(0, 8).map((i: { title: string; priority: string; resolution: string }) =>
  `- [${i.priority}] ${i.title} — Resolution: ${i.resolution || 'Not documented'}`
).join('\n') || 'None'}

MISSED MILESTONES (${missedMilestones.length}):
${missedMilestones.map((m: { name: string; dueDate: string }) =>
  `- ${m.name} (was due ${m.dueDate})`
).join('\n') || 'None'}

INVALIDATED ASSUMPTIONS (${invalidatedAssumptions.length}):
${invalidatedAssumptions.map((a: { assumption: string; impactIfInvalid: string }) =>
  `- ${a.assumption} — Impact: ${a.impactIfInvalid}`
).join('\n') || 'None'}

ACCEPTED CHANGE REQUESTS (${acceptedChanges.length}):
${acceptedChanges.slice(0, 5).map((c: { name: string; reason: string; durationImpact: string }) =>
  `- ${c.name}: ${c.reason} (Duration impact: ${c.durationImpact || 'N/A'})`
).join('\n') || 'None'}
  `.trim();

  const systemPrompt = `You are a senior Project Manager extracting lessons learned from project data.
Your lessons are specific, actionable, and help future projects avoid the same problems.
Be honest about what went wrong and concrete about recommendations.
Format your response as valid JSON matching the exact schema provided.`;

  const userPrompt = `Analyse the project data below and generate a set of lessons learned.
Return ONLY a valid JSON array of lesson objects with this exact structure:
[
  {
    "phase": "phase name (e.g. Planning, Execution, Monitoring, Closure)",
    "category": "process" | "technical" | "people" | "tools" | "communication",
    "whatWorked": "what went well or what saved the project",
    "whatDidnt": "what went wrong or caused delays/issues",
    "recommendation": "specific, actionable recommendation for future projects"
  }
]

Generate 4-6 lessons covering different categories and phases. Base them on the actual evidence in the project data (risks, issues, missed milestones, assumption failures, change requests).

PROJECT DATA:
${context}`;

  try {
    const stream = client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
              );
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
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: 'Invalid ANTHROPIC_API_KEY.' }, { status: 401 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: 'Rate limit reached. Please wait and try again.' }, { status: 429 });
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
