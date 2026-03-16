import { NextRequest, NextResponse } from 'next/server';
import { confluenceFetch } from '@/lib/confluence';

export async function GET(req: NextRequest) {
  const baseUrl = req.headers.get('x-confluence-base-url') || '';
  const email = req.headers.get('x-confluence-email') || '';
  const apiToken = req.headers.get('x-confluence-token') || '';
  const query = req.nextUrl.searchParams.get('q') || '';
  const spaceKey = req.nextUrl.searchParams.get('spaceKey') || '';

  if (!baseUrl || !email || !apiToken) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 401 });
  }

  try {
    let cql = `type=page AND text~"${query}"`;
    if (spaceKey) cql += ` AND space="${spaceKey}"`;

    const data = await confluenceFetch(
      { baseUrl, email, apiToken },
      `/content/search?cql=${encodeURIComponent(cql)}&limit=20`
    );

    const pages = data.results?.map((p: Record<string, unknown>) => ({
      id: p.id,
      title: p.title,
      spaceKey: (p.space as Record<string, unknown>)?.key,
      spaceName: (p.space as Record<string, unknown>)?.name,
      url: `${baseUrl}/wiki${(p._links as Record<string, unknown>)?.webui}`,
      lastModified: (p.version as Record<string, unknown>)?.when,
    })) || [];

    return NextResponse.json({ pages });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
