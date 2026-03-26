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
    systemPrompt: `You are a certified PMP and PM training expert with deep knowledge of PMI certification exams. Generate high-quality multiple-choice questions that mirror actual certification exam standards.

RULES:
- Each question must have EXACTLY 4 options with only ONE correct answer
- Questions must be factually accurate based on PMBOK 7th Edition, Agile Practice Guide, and Scrum Guide
- Include a clear, educational explanation for each correct answer referencing the specific standard or framework
- Vary question types: knowledge recall, scenario-based, application, analysis
- Never repeat the same concept across questions
- Make distractors (wrong options) plausible but clearly wrong to someone who studied
- For advanced questions, use real-world scenarios

CERTIFICATION-SPECIFIC STANDARDS:
- PMP: Follow the 3-domain structure — People (42%), Process (50%), Business Environment (8%). Use scenario-based questions. Include predictive, agile, and hybrid approaches. Questions should test application of knowledge, not just recall.
- CAPM: Focus on foundational PM concepts. Cover predictive plan-driven and agile/adaptive approaches. Questions can be more knowledge-based than PMP. Reference PMBOK Guide terminology directly.
- Agile: Focus on Scrum Guide, Kanban, SAFe, XP practices. Include servant leadership, self-organizing teams, empirical process control, and scaling frameworks.

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
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correctIndex": 2,
    "explanation": "Why the correct answer is right and why others are wrong (2-3 sentences)",
    "topic": "one of: ${topicList}",
    "certification": "one of: ${certList}",
    "difficulty": "one of: ${diffList}"
  }
]

CRITICAL RULES FOR correctIndex:
- correctIndex is the 0-based position of the correct answer in the options array (0=A, 1=B, 2=C, 3=D)
- You MUST distribute correct answers RANDOMLY and UNPREDICTABLY across all positions
- Target distribution: approximately 25% for each of 0, 1, 2, 3 — but in a shuffled, non-repeating pattern
- FORBIDDEN patterns: sequential (0,1,2,3,0,1,2,3), all-same (0,0,0,0), or any predictable cycle
- NEVER use the same correctIndex more than 2 times in a row
- A student must NOT be able to guess the answer by looking at position patterns alone
- Treat it like a shuffled deck: spread answers across A, B, C, D unpredictably
- Double-check: the text at options[correctIndex] must always be the factually correct answer

IMPORTANT: Generate EXACTLY ${count} questions. Number the ids sequentially: gen_1, gen_2, etc.
Distribute questions evenly across the requested topics.
${certList.includes('pmp') ? `\nPMP EXAM FORMAT: The real PMP exam has 180 questions in 230 minutes. Questions should be predominantly scenario-based ("A project manager is facing...") testing application of knowledge across predictive, agile, and hybrid approaches. Follow domain weighting: People 42%, Process 50%, Business Environment 8%.` : ''}
${certList.includes('capm') ? `\nCAPM EXAM FORMAT: The real CAPM exam has 150 questions in 180 minutes. Include a mix of knowledge-based and application questions. Cover the 12 knowledge areas and 5 process groups as defined in PMBOK Guide. Include both predictive and agile concepts.` : ''}`,
  });
}
