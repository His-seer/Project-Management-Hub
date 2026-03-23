import { NextRequest } from 'next/server';
import { streamAndRespond } from '@/lib/aiUtils';

/**
 * AI-powered quiz question generation.
 * Generates a set of unique PM questions based on user preferences.
 */
export async function POST(req: NextRequest) {
  const { topics, certifications, difficulty, questionCount, model } = await req.json() as {
    topics: string[];
    certifications: string[];
    difficulty: string[];
    questionCount: number;
    model?: string;
  };

  if (!topics?.length) return Response.json({ error: 'At least one topic is required' }, { status: 400 });

  const count = Math.min(Math.max(questionCount || 10, 3), 30);

  const topicList = topics.join(', ');
  const certList = certifications.length > 0 ? certifications.join(', ') : 'general PM';
  const diffList = difficulty.length > 0 ? difficulty.join(', ') : 'mixed';

  return streamAndRespond({
    model: model || 'gemini-2.5-flash',
    systemPrompt: `You are a certified PMP and PM training expert. Generate high-quality multiple-choice questions for project management certification exams and PM skill assessment.

RULES:
- Each question must have EXACTLY 4 options with only ONE correct answer
- Questions must be factually accurate based on PMBOK 7th Edition, Agile Practice Guide, and Scrum Guide
- Include a clear, educational explanation for each correct answer
- Vary question types: knowledge recall, scenario-based, application, analysis
- Never repeat the same concept across questions
- Make distractors (wrong options) plausible but clearly wrong to someone who studied
- For advanced questions, use real-world scenarios
- Return ONLY valid JSON`,
    userMessage: `Generate exactly ${count} unique multiple-choice questions.

TOPICS TO COVER: ${topicList}
CERTIFICATION FOCUS: ${certList}
DIFFICULTY LEVEL: ${diffList}

Return ONLY a JSON array with this EXACT structure:
[
  {
    "id": "gen_1",
    "question": "The full question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Why the correct answer is right and why others are wrong (2-3 sentences)",
    "topic": "one of: ${topicList}",
    "certification": "one of: ${certList}",
    "difficulty": "one of: ${diffList}"
  }
]

IMPORTANT: Generate EXACTLY ${count} questions. Number the ids sequentially: gen_1, gen_2, etc.
Distribute questions evenly across the requested topics.`,
  });
}
