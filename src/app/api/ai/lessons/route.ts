import { NextRequest } from 'next/server';
import { streamAiResponse } from '@/lib/aiClient';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { project, model }: { project: any; model?: string } = body;

  if (!project) {
    return Response.json({ error: 'Project data is required' }, { status: 400 });
  }

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

  const SSE_HEADERS = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  };

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
