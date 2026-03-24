import { NextRequest } from 'next/server';
import { streamAndRespond } from '@/lib/aiUtils';

export async function POST(req: NextRequest) {
  const { prompt, mode } = await req.json();

  // mode: 'full' | 'charter' | 'risks' | 'team'
  const systemPrompts: Record<string, string> = {
    full: `You are a senior project manager assistant. Extract structured project information from the user's description or document text.
Return ONLY valid JSON (no markdown, no code fences) matching this exact structure:
{
  "name": "project name",
  "description": "2-3 sentence description",
  "startDate": "YYYY-MM-DD or empty string",
  "endDate": "YYYY-MM-DD or empty string",
  "vision": "What does success look like? 1-2 sentences",
  "objectives": ["objective 1", "objective 2", "objective 3"],
  "scope": "What is included in this project",
  "teamRoles": [
    { "role": "Project Manager", "reason": "why needed" },
    { "role": "Developer", "reason": "why needed" }
  ],
  "risks": [
    { "title": "Risk title", "description": "Impact and likelihood" },
    { "title": "Risk title", "description": "Impact and likelihood" }
  ]
}
If dates are not mentioned, use "" for date fields.
Generate realistic, professional PM content. Return 3-5 objectives, 3-5 team roles, and 3-5 risks.`,

    charter: `You are a senior project manager. Based on the project description provided, generate professional charter content.
Return ONLY valid JSON (no markdown, no code fences):
{
  "vision": "Inspiring 1-2 sentence vision statement",
  "objectives": ["SMART objective 1", "SMART objective 2", "SMART objective 3", "SMART objective 4"],
  "scope": "Clear, concise scope statement covering what is included"
}
Make objectives SMART (Specific, Measurable, Achievable, Relevant, Time-bound). Be professional and specific.`,

    risks: `You are a risk management expert. Based on the project description, identify the top risks.
Return ONLY valid JSON (no markdown, no code fences):
{
  "risks": [
    { "title": "Concise risk title", "description": "Specific impact and likelihood description" },
    { "title": "Concise risk title", "description": "Specific impact and likelihood description" },
    { "title": "Concise risk title", "description": "Specific impact and likelihood description" },
    { "title": "Concise risk title", "description": "Specific impact and likelihood description" },
    { "title": "Concise risk title", "description": "Specific impact and likelihood description" }
  ]
}
Cover different risk categories: technical, schedule, resource, stakeholder, budget. Be specific to the project type.`,

    team: `You are a project staffing expert. Based on the project description, suggest the key team roles needed.
Return ONLY valid JSON (no markdown, no code fences):
{
  "teamRoles": [
    { "role": "Role title", "reason": "Why this role is critical for this project" },
    { "role": "Role title", "reason": "Why this role is critical for this project" },
    { "role": "Role title", "reason": "Why this role is critical for this project" },
    { "role": "Role title", "reason": "Why this role is critical for this project" }
  ]
}
Include 4-6 realistic roles. Be specific to the project type, not generic.`,
  };

  const selectedPrompt = systemPrompts[mode || 'full'];

  return streamAndRespond({
    model: 'gemini-2.5-flash',
    systemPrompt: selectedPrompt,
    userMessage: `Project information:\n${prompt}`,
  });
}
