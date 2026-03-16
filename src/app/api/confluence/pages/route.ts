import { NextRequest, NextResponse } from 'next/server';
import { confluenceFetch } from '@/lib/confluence';

// Create page
export async function POST(req: NextRequest) {
  const baseUrl = req.headers.get('x-confluence-base-url') || '';
  const email = req.headers.get('x-confluence-email') || '';
  const apiToken = req.headers.get('x-confluence-token') || '';

  if (!baseUrl || !email || !apiToken) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = await confluenceFetch({ baseUrl, email, apiToken }, '/content', {
      method: 'POST',
      body: JSON.stringify({
        type: 'page',
        title: body.title,
        space: { key: body.spaceKey },
        body: {
          storage: {
            value: body.content || '<p>Created from PM Hub</p>',
            representation: 'storage',
          },
        },
      }),
    });
    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
