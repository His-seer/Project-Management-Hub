import { NextRequest, NextResponse } from 'next/server';
import { streamAndRespond } from '@/lib/aiUtils';
import { RESOURCES } from '@/lib/pmResources';
import { QUIZ_TOPICS } from '@/lib/quizBank';

/**
 * AI-powered learning recommendations based on quiz performance.
 * Analyzes weak areas and suggests specific resources + YouTube search terms.
 */
export async function POST(req: NextRequest) {
  const { quizHistory } = await req.json() as {
    quizHistory: Array<{
      score: number;
      total_questions: number;
      question_ids: string[];
      answers: (number | null)[];
      preferences?: { topics?: string[]; certifications?: string[]; difficulty?: string[] };
    }>;
  };

  if (!quizHistory?.length) {
    return NextResponse.json({ error: 'Quiz history is required' }, { status: 400 });
  }

  // Analyze performance per topic from quiz attempts
  // Use preferences.topics to attribute scores since AI-generated question IDs
  // won't match the static question bank
  const topicStats: Record<string, { correct: number; total: number }> = {};

  for (const attempt of quizHistory) {
    const topics = attempt.preferences?.topics || [];
    const score = attempt.score || 0;
    const total = attempt.total_questions || 0;

    if (topics.length > 0 && total > 0) {
      // Distribute score proportionally across the topics selected for this attempt
      const perTopic = Math.round(total / topics.length);
      const correctPerTopic = Math.round(score / topics.length);
      for (const topic of topics) {
        if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0 };
        topicStats[topic].total += perTopic;
        topicStats[topic].correct += correctPerTopic;
      }
    }
  }

  // Sort all topics by score
  const allTopics = Object.entries(topicStats)
    .map(([topic, stats]) => ({
      topic,
      score: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      correct: stats.correct,
      total: stats.total,
    }))
    .sort((a, b) => a.score - b.score);

  const weakTopics = allTopics.filter(t => t.score < 80);
  const strongTopics = allTopics.filter(t => t.score >= 80);
  const overallScore = allTopics.reduce((sum, t) => sum + t.correct, 0) / Math.max(allTopics.reduce((sum, t) => sum + t.total, 0), 1) * 100;
  const totalQuestions = quizHistory.reduce((sum, h) => sum + (h.total_questions || 0), 0);

  const topicLabels = QUIZ_TOPICS.reduce<Record<string, string>>((acc, t) => {
    acc[t.id] = t.label;
    return acc;
  }, {});

  // Get available curated resources
  const availableResources = RESOURCES.slice(0, 20).map((r) => `- "${r.title}" (${r.category}, ${r.type})`).join('\n');

  return streamAndRespond({
    model: 'gemini-2.5-flash',
    systemPrompt: `You are a PM learning advisor. You have REAL quiz data — use the exact numbers provided. Do NOT invent or assume any scores. Return ONLY valid JSON.`,
    userMessage: `Analyze this PM quiz performance and recommend targeted learning resources.

QUIZ SUMMARY:
- Total attempts: ${quizHistory.length}
- Total questions answered: ${totalQuestions}
- Overall accuracy: ${Math.round(overallScore)}%

${weakTopics.length > 0 ? `AREAS NEEDING IMPROVEMENT (below 80%):
${weakTopics.map((t) => `- ${topicLabels[t.topic] || t.topic}: ${t.score}% correct (${t.correct}/${t.total} questions)`).join('\n')}` : 'No weak areas — all topics above 80%.'}

${strongTopics.length > 0 ? `STRONG AREAS (80%+):
${strongTopics.map((t) => `- ${topicLabels[t.topic] || t.topic}: ${t.score}% correct (${t.correct}/${t.total} questions)`).join('\n')}` : ''}

AVAILABLE CURATED RESOURCES:
${availableResources}

INSTRUCTIONS:
- Use ONLY the exact scores above — do not fabricate numbers
- Reference the specific percentages and question counts provided
- If there are no weak areas, recommend advanced topics to push expertise further
- Each recommendation must include a concrete next step

Return ONLY a JSON object:
{
  "analysis": "2-3 sentences using the EXACT scores above. Mention specific topics and percentages.",
  "recommendations": [
    {
      "topic": "topic name",
      "priority": "high|medium|low",
      "reason": "specific reason referencing the score data above",
      "suggestedResources": ["title from curated resources list above"],
      "youtubeSearchTerms": ["specific search term for YouTube"]
    }
  ]
}

Return 3-5 recommendations.`,
  });
}
