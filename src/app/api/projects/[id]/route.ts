import { NextRequest, NextResponse } from 'next/server';
import { saveProject, saveModule, deleteProject } from '@/lib/dbHelpers';
import sql from '@/lib/db';
import type { Project } from '@/types';

// PUT full project
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await req.json() as Project;
    await saveProject(id, data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PATCH single module — efficient per-module sync
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { module, data } = await req.json() as { module: keyof Project; data: unknown };
    await saveModule(id, module, data as Project[typeof module]);
    // Update timestamp
    await sql`UPDATE projects SET updated_at = NOW() WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteProject(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
