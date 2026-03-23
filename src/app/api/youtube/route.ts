import { NextRequest, NextResponse } from 'next/server';

/**
 * YouTube search proxy — searches for PM-related videos.
 * Uses YouTube Data API v3 (requires YOUTUBE_API_KEY env var).
 * Falls back to a scrape-free embed URL approach if no API key.
 */

interface YouTubeSearchResult {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');
  const maxResults = Math.min(Number(req.nextUrl.searchParams.get('max')) || 8, 20);

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      results: [],
      source: 'no-api-key',
      message: 'Set GOOGLE_API_KEY env var to enable live YouTube search.',
    });
  }

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('q', `${query} project management`);
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', String(maxResults));
    url.searchParams.set('relevanceLanguage', 'en');
    url.searchParams.set('safeSearch', 'strict');
    url.searchParams.set('videoDuration', 'medium'); // 4-20 min videos
    url.searchParams.set('key', apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`YouTube API error: ${res.status} ${err.slice(0, 200)}`);
    }

    const data = await res.json() as {
      items: Array<{
        id: { videoId: string };
        snippet: {
          title: string;
          description: string;
          thumbnails: { high?: { url: string }; medium?: { url: string } };
          channelTitle: string;
          publishedAt: string;
        };
      }>;
    };

    const results: YouTubeSearchResult[] = (data.items ?? []).map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.medium?.url ?? '',
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
    }));

    return NextResponse.json({ results, source: 'youtube-api' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'YouTube search failed', results: [] },
      { status: 500 }
    );
  }
}
