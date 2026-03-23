import { NextRequest, NextResponse } from 'next/server';
import { streamAndRespond } from '@/lib/aiUtils';
import { RESOURCES } from '@/lib/pmResources';
import { QUESTIONS, QUIZ_TOPICS, type QuizTopic } from '@/lib/quizBank';

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
    }>;
  };

  if (!quizHistory?.length) {
    return NextResponse.json({ error: 'Quiz history is required' }, { status: 400 });
  }

  // Analyze weak topics from quiz history
  const topicStats: Record<string, { correct: number; total: number }> = {};

  for (const attempt of quizHistory) {
    const qIds = attempt.question_ids as string[];
    const answers = attempt.answers as (number | null)[];

    qIds.forEach((qId, i) => {
      const question = QUESTIONS.find((q) => q.id === qId);
      if (!question) return;
      const topic = question.topic;
      if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0 };
      topicStats[topic].total++;
      if (answers[i] === question.correctIndex) topicStats[topic].correct++;
    });
  }

  // Sort topics by weakness (lowest score first)
  const weakTopics = Object.entries(topicStats)
    .map(([topic, stats]) => ({
      topic,
      score: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      total: stats.total,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  const topicLabels = QUIZ_TOPICS.reduce<Record<string, string>>((acc, t) => {
    acc[t.id] = t.label;
    return acc;
  }, {});

  // Get available curated resources
  const availableResources = RESOURCES.slice(0, 20).map((r) => `- "${r.title}" (${r.category}, ${r.type})`).join('\n');

  return streamAndRespond({
    model: 'gemini-2.5-flash',
    systemPrompt: `You are a PM learning advisor. Analyze quiz performance data and recommend learning resources. Be specific and actionable. Return ONLY valid JSON.`,
    userMessage: `Based on this PM quiz performance, recommend learning resources:

WEAK AREAS (lowest scores first):
${weakTopics.map((t) => `- ${topicLabels[t.topic] || t.topic}: ${t.score}% (${t.total} questions)`).join('\n')}

AVAILABLE CURATED RESOURCES:
${availableResources}

Return ONLY a JSON object:
{
  "analysis": "2-3 sentences summarizing strengths and weaknesses",
  "recommendations": [
    {
      "topic": "topic name",
      "priority": "high|medium|low",
      "reason": "why this area needs improvement",
      "suggestedResources": ["title of curated resource 1"],
      "youtubeSearchTerms": ["search term for YouTube videos on this topic"]
    }
  ]
}

Return 3-5 recommendations. Focus on the weakest areas first.`,
  });
}
