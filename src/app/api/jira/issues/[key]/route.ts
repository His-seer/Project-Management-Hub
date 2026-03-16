import { NextRequest, NextResponse } from 'next/server';
import { jiraFetch } from '@/lib/jira';

// Get issue detail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const baseUrl = req.headers.get('x-jira-base-url') || '';
  const email = req.headers.get('x-jira-email') || '';
  const apiToken = req.headers.get('x-jira-token') || '';

  if (!baseUrl || !email || !apiToken) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 401 });
  }

  try {
    const data = await jiraFetch({ baseUrl, email, apiToken }, `/api/2/issue/${key}`);
    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Update issue or transition
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const baseUrl = req.headers.get('x-jira-base-url') || '';
  const email = req.headers.get('x-jira-email') || '';
  const apiToken = req.headers.get('x-jira-token') || '';

  if (!baseUrl || !email || !apiToken) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 401 });
  }

  try {
    const body = await req.json();

    // If transition requested
    if (body.transition) {
      await jiraFetch({ baseUrl, email, apiToken }, `/api/2/issue/${key}/transitions`, {
        method: 'POST',
        body: JSON.stringify({ transition: { id: body.transition } }),
      });
      return NextResponse.json({ success: true });
    }

    // Otherwise update fields
    await jiraFetch({ baseUrl, email, apiToken }, `/api/2/issue/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ fields: body.fields }),
    });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
