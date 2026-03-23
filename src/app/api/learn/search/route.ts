import { NextRequest } from 'next/server';
import { streamAndRespond } from '@/lib/aiUtils';

/**
 * AI-powered learning resource search.
 * Generates curated resource recommendations for any PM topic —
 * returns articles, courses, videos, guides, and tools with real URLs.
 */
export async function POST(req: NextRequest) {
  const { query, type, model } = await req.json() as {
    query: string;
    type?: 'all' | 'video' | 'course' | 'article' | 'guide' | 'tool';
    model?: string;
  };

  if (!query?.trim()) return Response.json({ error: 'Query is required' }, { status: 400 });

  const typeFilter = type && type !== 'all' ? `Focus specifically on ${type}s.` : 'Include a mix of articles, courses, videos, guides, and tools.';

  return streamAndRespond({
    model: model || 'gemini-2.5-flash',
    systemPrompt: `You are a PM learning resource curator. When given a topic, suggest real, high-quality, FREE learning resources with accurate URLs. Only recommend resources that actually exist and are freely accessible. Return ONLY valid JSON.`,
    userMessage: `Find free learning resources about: "${query}"

${typeFilter}

Return ONLY a JSON array of 6-10 resources:
[
  {
    "title": "Resource title",
    "description": "1-2 sentence description of what you'll learn",
    "url": "https://actual-real-url.com/path",
    "type": "course|article|video|guide|tool|community",
    "provider": "Organization or website name",
    "difficulty": "beginner|intermediate|advanced",
    "youtubeId": "VIDEO_ID_if_youtube_otherwise_null",
    "estimatedMinutes": 15
  }
]

IMPORTANT:
- Only include resources with REAL, working URLs from known PM education providers
- Prefer: PMI.org, Coursera, Scrum.org, Atlassian, Wrike, ProjectManagement.com, YouTube (specific videos), Harvard Business Review, MIT OpenCourseWare
- For YouTube videos, include the actual video ID in youtubeId field
- Every resource must be FREE to access (or free to audit for courses)`,
  });
}
