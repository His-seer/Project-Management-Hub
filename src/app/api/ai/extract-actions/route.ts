import { NextRequest } from 'next/server';
import { streamAndRespond } from '@/lib/aiUtils';

export async function POST(req: NextRequest) {
  const { notes, attendees, title, model } = await req.json();
  if (!notes) return Response.json({ error: 'Meeting notes are required' }, { status: 400 });

  return streamAndRespond({
    model: model || 'gemini-2.5-flash',
    systemPrompt: `You are an expert meeting analyst. Extract decisions made and action items from meeting notes. Be precise about owners and deadlines. Only extract what is explicitly or strongly implied in the notes — do not invent actions. Return ONLY valid JSON.`,
    userMessage: `Extract decisions and action items from these meeting notes:

MEETING: ${title || 'Untitled'}
ATTENDEES: ${(attendees ?? []).join(', ') || 'Unknown'}

NOTES:
${notes}

Return ONLY a JSON object:
{
  "decisions": [
    { "decision": "What was decided", "madeBy": "Who made it (from attendees if possible)" }
  ],
  "actionItems": [
    { "description": "What needs to be done", "owner": "Who should do it", "dueDate": "YYYY-MM-DD or empty string if not mentioned", "status": "open" }
  ]
}

If no decisions or actions are found, return empty arrays. Do not fabricate items.`,
  });
}
