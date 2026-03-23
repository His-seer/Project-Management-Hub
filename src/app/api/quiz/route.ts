import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET — load quiz history
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId') || 'default';
  try {
    // Ensure table exists
    await sql`
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT 'default',
        preferences JSONB NOT NULL,
        question_ids JSONB NOT NULL,
        answers JSONB NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        time_spent_seconds INTEGER NOT NULL DEFAULT 0,
        completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_quiz_user ON quiz_attempts(user_id)`;

    const rows = await sql`
      SELECT * FROM quiz_attempts
      WHERE user_id = ${userId}
      ORDER BY completed_at DESC
      LIMIT 50
    `;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST — save quiz attempt
export async function POST(req: NextRequest) {
  try {
    const { id, userId, preferences, questionIds, answers, score, totalQuestions, timeSpentSeconds } = await req.json();

    // Ensure table exists
    await sql`
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT 'default',
        preferences JSONB NOT NULL,
        question_ids JSONB NOT NULL,
        answers JSONB NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        time_spent_seconds INTEGER NOT NULL DEFAULT 0,
        completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      INSERT INTO quiz_attempts (id, user_id, preferences, question_ids, answers, score, total_questions, time_spent_seconds)
      VALUES (${id}, ${userId || 'default'}, ${JSON.stringify(preferences)}, ${JSON.stringify(questionIds)}, ${JSON.stringify(answers)}, ${score}, ${totalQuestions}, ${timeSpentSeconds || 0})
    `;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
