import { NextRequest } from 'next/server';
import { streamAndRespond } from '@/lib/aiUtils';

export async function POST(req: NextRequest) {
  const { stakeholders, projectName, projectDescription, model } = await req.json();
  if (!stakeholders?.length) return Response.json({ error: 'Stakeholder data is required' }, { status: 400 });

  const stakeholderList = stakeholders.map((s: { name: string; role: string; power: number; interest: number; engagement: string }) =>
    `- ${s.name} (${s.role}): Power=${s.power}/5, Interest=${s.interest}/5, Current engagement=${s.engagement}`
  ).join('\n');

  return streamAndRespond({
    model: model || 'gemini-2.5-flash',
    systemPrompt: `You are a senior stakeholder management consultant. Based on stakeholder analysis data (power/interest grid), recommend engagement strategies. Be practical and actionable. Return ONLY valid JSON.`,
    userMessage: `Recommend engagement strategies for these stakeholders:

PROJECT: ${projectName || 'Unknown'}
DESCRIPTION: ${projectDescription || 'N/A'}

STAKEHOLDERS:
${stakeholderList}

Return ONLY a JSON array:
[
  {
    "stakeholderName": "Name",
    "quadrant": "Manage Closely|Keep Satisfied|Keep Informed|Monitor",
    "recommendedEngagement": "supportive|leading|neutral",
    "suggestedActions": "2-3 specific engagement actions",
    "communicationFrequency": "Weekly|Bi-weekly|Monthly|Quarterly"
  }
]`,
  });
}
