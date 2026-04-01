import { NextRequest } from 'next/server';
import { streamAndRespond } from '@/lib/aiUtils';

export async function POST(req: NextRequest) {
  const { transcript, projectName, model } = await req.json();
  if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 20) {
    return Response.json({ error: 'A meeting transcript of at least 20 characters is required' }, { status: 400 });
  }

  return streamAndRespond({
    model: model || 'gemini-2.5-flash',
    systemPrompt: `You are a senior project manager who excels at extracting structured meeting data from raw transcripts. You identify the meeting topic, key attendees, agenda items discussed, concise notes, decisions made, and action items with owners and deadlines. Be thorough but concise. Return ONLY valid JSON.`,
    userMessage: `Parse this meeting transcript and extract structured data:

PROJECT CONTEXT: ${projectName || 'Unknown project'}

TRANSCRIPT:
${transcript}

Return ONLY a JSON object:
{
  "title": "Clear, descriptive meeting title based on content discussed",
  "date": "YYYY-MM-DD if mentioned, otherwise empty string",
  "attendees": ["Name or role of each participant identified"],
  "agenda": "Bullet-point summary of topics discussed (use \\n for line breaks)",
  "notes": "Concise summary of key discussion points (use \\n for paragraphs)",
  "decisions": [
    { "decision": "What was decided — be specific", "madeBy": "Who made or proposed it" }
  ],
  "actionItems": [
    { "description": "Specific task to be done", "owner": "Person responsible", "dueDate": "YYYY-MM-DD or empty string", "status": "open" }
  ]
}

RULES:
- Extract ALL decisions and action items, even implicit ones ("Let's go with option B" = decision)
- For action items, infer reasonable owners from context when not explicit
- Keep notes factual — do not add opinions or interpretations
- If date is not mentioned, leave it as empty string
- Attendees: extract names from the transcript (speaker labels, mentions, etc.)`,
  });
}
