import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET — load bookmarks
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId') || 'default';
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS learning_bookmarks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT 'default',
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        youtube_id TEXT,
        description TEXT DEFAULT '',
        provider TEXT DEFAULT '',
        category TEXT DEFAULT 'saved',
        thumbnail TEXT DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON learning_bookmarks(user_id)`;

    const rows = await sql`
      SELECT * FROM learning_bookmarks
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 100
    `;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST — save bookmark
export async function POST(req: NextRequest) {
  try {
    const { id, userId, title, url, youtubeId, description, provider, category, thumbnail } = await req.json();

    await sql`
      CREATE TABLE IF NOT EXISTS learning_bookmarks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT 'default',
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        youtube_id TEXT,
        description TEXT DEFAULT '',
        provider TEXT DEFAULT '',
        category TEXT DEFAULT 'saved',
        thumbnail TEXT DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      INSERT INTO learning_bookmarks (id, user_id, title, url, youtube_id, description, provider, category, thumbnail)
      VALUES (${id}, ${userId || 'default'}, ${title}, ${url}, ${youtubeId || null}, ${description || ''}, ${provider || ''}, ${category || 'saved'}, ${thumbnail || ''})
      ON CONFLICT (id) DO NOTHING
    `;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE — remove bookmark
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await sql`DELETE FROM learning_bookmarks WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
