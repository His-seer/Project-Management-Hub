import { NextRequest, NextResponse } from 'next/server';
import { loadAllProjects, saveProject } from '@/lib/dbHelpers';
import type { Project } from '@/types';

export async function GET() {
  try {
    const projects = await loadAllProjects();
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id, data } = await req.json() as { id: string; data: Project };
    await saveProject(id, data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
