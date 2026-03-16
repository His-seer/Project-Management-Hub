import { NextRequest, NextResponse } from 'next/server';
import { jiraFetch } from '@/lib/jira';

// Create issue
export async function POST(req: NextRequest) {
  const baseUrl = req.headers.get('x-jira-base-url') || '';
  const email = req.headers.get('x-jira-email') || '';
  const apiToken = req.headers.get('x-jira-token') || '';

  if (!baseUrl || !email || !apiToken) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = await jiraFetch({ baseUrl, email, apiToken }, '/api/2/issue', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
