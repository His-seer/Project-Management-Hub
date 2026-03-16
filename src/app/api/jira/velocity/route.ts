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
    // Get closed sprints for velocity
    const sprints = await jiraFetch(
      { baseUrl, email, apiToken },
      `/agile/1.0/board/${boardId}/sprint?state=closed&maxResults=10`
    );

    const velocity = [];
    for (const sprint of sprints.values || []) {
      const issues = await jiraFetch(
        { baseUrl, email, apiToken },
        `/agile/1.0/sprint/${sprint.id}/issue?maxResults=200&fields=customfield_10016,status`
      );
      const completed = issues.issues?.filter(
        (i: Record<string, unknown>) =>
          ((i.fields as Record<string, unknown>)?.status as Record<string, unknown>)?.name === 'Done' ||
          (((i.fields as Record<string, unknown>)?.status as Record<string, unknown>)?.statusCategory as Record<string, unknown>)?.key === 'done'
      ) || [];
      const points = completed.reduce(
        (sum: number, i: Record<string, unknown>) =>
          sum + (Number((i.fields as Record<string, unknown>)?.customfield_10016) || 0),
        0
      );
      velocity.push({
        sprintName: sprint.name,
        completedPoints: points,
        totalIssues: issues.issues?.length || 0,
        completedIssues: completed.length,
      });
    }

    return NextResponse.json({ velocity });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
