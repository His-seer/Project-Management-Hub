import { NextRequest, NextResponse } from 'next/server';
import { confluenceFetch } from '@/lib/confluence';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const baseUrl = req.headers.get('x-confluence-base-url') || '';
  const email = req.headers.get('x-confluence-email') || '';
  const apiToken = req.headers.get('x-confluence-token') || '';

  if (!baseUrl || !email || !apiToken) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 401 });
  }

  try {
    const data = await confluenceFetch(
      { baseUrl, email, apiToken },
      `/content/${id}?expand=body.storage,version,space`
    );
    return NextResponse.json({
      id: data.id,
      title: data.title,
      spaceKey: data.space?.key,
      content: data.body?.storage?.value,
      version: data.version?.number,
      lastModified: data.version?.when,
      url: `${baseUrl}/wiki${data._links?.webui}`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
