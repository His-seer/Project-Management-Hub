import { NextRequest } from 'next/server';
import { streamAndRespond } from '@/lib/aiUtils';

export async function POST(req: NextRequest) {
  const { risk, projectName, projectDescription, model } = await req.json();
  if (!risk) return Response.json({ error: 'Risk data is required' }, { status: 400 });

  return streamAndRespond({
    model: model || 'gemini-2.5-flash',
    systemPrompt: `You are a senior risk management consultant. Given a project risk, suggest a practical mitigation strategy and contingency plan. Be specific, actionable, and concise. Return ONLY valid JSON.`,
    userMessage: `Analyse this risk and suggest mitigation:

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
}`,
  });
}
