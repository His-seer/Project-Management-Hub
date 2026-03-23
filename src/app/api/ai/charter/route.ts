import { NextRequest } from 'next/server';
import { streamAiResponse } from '@/lib/aiClient';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { project, model }: { project: any; model?: string } = body;

  if (!project) {
    return Response.json({ error: 'Project data is required' }, { status: 400 });
  }

  const context = `
PROJECT NAME: ${project.meta.name}
DESCRIPTION: ${project.meta.description}
START DATE: ${project.meta.startDate}
TARGET END DATE: ${project.meta.targetEndDate}
TOTAL BUDGET: $${project.funding?.totalBudget?.toLocaleString() ?? 'Not set'}
TEAM SIZE: ${project.resources?.length ?? 0} resources

EXISTING PLAN GOALS:
${(project.plan?.goals ?? []).map((g: string, i: number) => `${i + 1}. ${g}`).join('\n') || 'None'}

EXISTING DELIVERABLES:
${(project.plan?.deliverables ?? []).map((d: { name: string; description: string }) => `- ${d.name}: ${d.description}`).join('\n') || 'None'}

EXISTING MILESTONES:
${(project.plan?.milestones ?? []).map((m: { name: string; dueDate: string }) => `- ${m.name} (${m.dueDate})`).join('\n') || 'None'}

STAKEHOLDERS:
${(project.stakeholders ?? []).map((s: { name: string; role: string }) => `- ${s.name} (${s.role})`).join('\n') || 'None'}
  `.trim();

  const systemPrompt = `You are an expert Project Manager writing a professional project charter.
Your charters are clear, strategic, and suitable for executive approval.
Be specific and actionable. Infer reasonable details from the project context.
Format your response as valid JSON matching the exact schema provided.`;

  const userPrompt = `Generate a comprehensive project charter based on the project data below.
Return ONLY a valid JSON object with this exact structure:
{
  "executiveSummary": "2-3 sentence paragraph summarising the project, its purpose, and expected outcome",
  "projectPurpose": "1-2 sentence statement of why this project exists and what problem it solves",
  "vision": "1 sentence inspiring vision statement for the end state",
  "objectives": ["objective 1", "objective 2", "objective 3", "objective 4", "objective 5"],
  "businessObjectives": ["business objective 1", "business objective 2", "business objective 3"],
  "technologyObjectives": ["tech objective 1", "tech objective 2", "tech objective 3"],
  "scope": "2-3 sentences describing what is included in scope",
  "outOfScope": "2-3 sentences describing what is explicitly excluded",
  "assumptions": ["assumption 1", "assumption 2", "assumption 3"],
  "constraints": ["constraint 1", "constraint 2", "constraint 3"],
  "qualityStandards": ["standard 1", "standard 2", "standard 3"],
  "successCriteria": ["criterion 1", "criterion 2", "criterion 3", "criterion 4"]
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
