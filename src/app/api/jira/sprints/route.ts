import { NextRequest, NextResponse } from 'next/server';
import { jiraFetch } from '@/lib/jira';

export async function GET(req: NextRequest) {
  const baseUrl = req.headers.get('x-jira-base-url') || '';
  const email = req.headers.get('x-jira-email') || '';
  const apiToken = req.headers.get('x-jira-token') || '';
  const boardId = req.nextUrl.searchParams.get('boardId');

  if (!baseUrl || !email || !apiToken || !boardId) {
    return NextResponse.json({ error: 'Missing credentials or boardId' }, { status: 400 });
  }

  try {
    // Get active sprint
    const sprints = await jiraFetch(
      { baseUrl, email, apiToken },
      `/agile/1.0/board/${boardId}/sprint?state=active`
    );
    const activeSprint = sprints.values?.[0];
    if (!activeSprint) {
      return NextResponse.json({ sprint: null, issues: [] });
    }

    // Get issues in sprint
    const issues = await jiraFetch(
      { baseUrl, email, apiToken },
      `/agile/1.0/sprint/${activeSprint.id}/issue?maxResults=100`
    );

    return NextResponse.json({
      sprint: activeSprint,
      issues: issues.issues?.map((i: Record<string, unknown>) => ({
        key: i.key,
        summary: (i.fields as Record<string, unknown>)?.summary,
        status: ((i.fields as Record<string, unknown>)?.status as Record<string, unknown>)?.name,
        statusCategory: (((i.fields as Record<string, unknown>)?.status as Record<string, unknown>)?.statusCategory as Record<string, unknown>)?.key,
        assignee: ((i.fields as Record<string, unknown>)?.assignee as Record<string, unknown>)?.displayName || 'Unassigned',
        priority: ((i.fields as Record<string, unknown>)?.priority as Record<string, unknown>)?.name,
        storyPoints: (i.fields as Record<string, unknown>)?.customfield_10016 ?? null,
        issueType: ((i.fields as Record<string, unknown>)?.issuetype as Record<string, unknown>)?.name,
      })) || [],
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
