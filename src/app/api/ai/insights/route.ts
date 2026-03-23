import { NextRequest } from 'next/server';
import { streamAndRespond } from '@/lib/aiUtils';

export async function POST(req: NextRequest) {
  const { project, model }: { project: unknown; model?: string } = await req.json();
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
  const openIssues = (proj.issues ?? []).filter((i) => i.status !== 'closed' && i.status !== 'resolved');
  const overdueActions = (proj.actionItems ?? []).filter(
    (a) => (a.status === 'open' || a.status === 'in-progress') && a.dueDate && new Date(a.dueDate) < new Date()
  );
  const missedMilestones = (proj.plan?.milestones ?? []).filter(
    (m) => m.status === 'missed' || (m.dueDate && new Date(m.dueDate) < new Date() && m.status !== 'completed')
  );

  return streamAndRespond({
    model: model || 'gemini-2.5-flash',
    systemPrompt: `You are a senior PM advisor. Analyze project data and provide predictive insights — things the PM might not notice. Focus on patterns, risks, and actionable recommendations. Return ONLY valid JSON.`,
    userMessage: `Analyze this project and provide up to 5 key insights:

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

Return 3-5 insights. Prioritize warnings, then suggestions, then positives. Only include genuinely useful observations — no padding.`,
  });
}
