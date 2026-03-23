import { NextRequest } from 'next/server';
import { streamAiResponse } from '@/lib/aiClient';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { project, model }: { project: any; model?: string } = body;

  if (!project) {
    return Response.json({ error: 'Project data is required' }, { status: 400 });
  }

  const openRisks = (project.risks ?? []).filter((r: { status: string }) => r.status === 'open' || r.status === 'mitigating');
  const highRisks = openRisks.filter((r: { severity: number }) => r.severity >= 12);
  const openIssues = (project.issues ?? []).filter((i: { status: string }) => i.status === 'open' || i.status === 'in-progress' || i.status === 'blocked');
  const blockedIssues = openIssues.filter((i: { status: string }) => i.status === 'blocked');
  const upcomingMilestones = (project.plan?.milestones ?? []).filter((m: { status: string; dueDate: string }) => m.status !== 'completed' && m.status !== 'missed').slice(0, 5);
  const kpis = (project.kpis ?? []).slice(0, 6);
  const recentMeetings = (project.meetings ?? []).slice(-2);
  const assumptions = (project.assumptions ?? []).filter((a: { validationStatus: string }) => a.validationStatus === 'invalidated');

  const context = `
PROJECT: ${project.meta.name}
Description: ${project.meta.description}
Status: ${project.meta.status} | Health: ${project.meta.health}
Start: ${project.meta.startDate} | Target End: ${project.meta.targetEndDate}
Today's Date: ${new Date().toISOString().split('T')[0]}

CHARTER VISION:
${project.charter?.vision ?? 'N/A'}

KEY OBJECTIVES (top 5):
${(project.charter?.objectives ?? []).slice(0, 5).map((o: string, i: number) => `${i + 1}. ${o}`).join('\n')}

OPEN RISKS (${openRisks.length} total, ${highRisks.length} high-severity):
${highRisks.slice(0, 5).map((r: { title: string; severity: number; owner: string; mitigationStrategy: string }) => `- [SEV ${r.severity}] ${r.title} (Owner: ${r.owner}) — Mitigation: ${r.mitigationStrategy}`).join('\n')}
${openRisks.length > highRisks.length ? `...and ${openRisks.length - highRisks.length} medium/low risks` : ''}

OPEN ISSUES (${openIssues.length} total, ${blockedIssues.length} blocked):
${openIssues.slice(0, 4).map((i: { title: string; priority: string; owner: string; status: string }) => `- [${i.priority.toUpperCase()}] ${i.title} (${i.owner}) — ${i.status}`).join('\n')}

UPCOMING MILESTONES:
${upcomingMilestones.map((m: { name: string; dueDate: string; status: string }) => `- ${m.name} | Due: ${m.dueDate} | Status: ${m.status}`).join('\n')}

KPI STATUS:
${kpis.map((k: { name: string; actual: number; target: number; unit: string; status: string }) => `- ${k.name}: ${k.actual}${k.unit} vs target ${k.target}${k.unit} — ${k.status}`).join('\n')}

INVALIDATED ASSUMPTIONS:
${assumptions.length > 0 ? assumptions.map((a: { assumption: string; impactIfInvalid: string }) => `- ${a.assumption} — Impact: ${a.impactIfInvalid}`).join('\n') : 'None'}

RECENT MEETINGS (last 2):
${recentMeetings.map((m: { title: string; date: string; decisions: { decision: string }[]; actionItems: { description: string; owner: string; status: string }[] }) => `
Meeting: ${m.title} (${m.date})
Decisions: ${m.decisions?.slice(0, 3).map((d) => d.decision).join('; ') ?? 'None'}
Open Actions: ${m.actionItems?.filter((a) => a.status !== 'done').map((a) => `${a.description} (${a.owner})`).join('; ') ?? 'None'}
`).join('\n')}
  `.trim();

  const systemPrompt = `You are an expert Project Manager generating a concise, professional weekly status report.
Your reports are clear, factual, action-oriented, and suitable for executive stakeholders.
Write in a direct, professional tone. Avoid fluff. Be specific about numbers, dates, and names where available.
Format your response as valid JSON matching the exact schema provided.`;

  const userPrompt = `Generate a weekly project status report for the project data below.
Return ONLY a valid JSON object with this exact structure:
{
  "overallStatus": "green" | "amber" | "red",
  "executiveSummary": "2-3 sentence paragraph summarizing overall project health, progress, and key concerns",
  "accomplishments": ["bullet 1", "bullet 2", "bullet 3", "bullet 4"],
  "nextPeriodPlans": ["bullet 1", "bullet 2", "bullet 3", "bullet 4"],
  "risks": "1-2 sentences on top risks and mitigations",
  "issues": "1-2 sentences on key issues and resolution status",
  "budgetStatus": "1 sentence on budget situation",
  "scheduleStatus": "1-2 sentences on schedule status and any variances"
}

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
