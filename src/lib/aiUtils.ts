/**
 * Shared AI utilities — eliminates duplication across AI routes and client pages.
 */

import { streamAiResponse } from '@/lib/aiClient';

// ─── SSE Helpers ───

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
} as const;

/**
 * Wraps a raw ReadableStream from Gemini into an SSE-formatted Response.
 * Replaces the ~20-line boilerplate duplicated in every AI route.
 */
export function createSseResponse(rawStream: ReadableStream): Response {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const reader = rawStream.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: err instanceof Error ? err.message : 'Stream error' })}\n\n`
          )
        );
        controller.close();
      }
    },
  });
  return new Response(readable, { headers: SSE_HEADERS });
}

/**
 * Full pipeline: streamAiResponse → createSseResponse.
 * One-liner replacement for most route handlers.
 */
export async function streamAndRespond(config: {
  model: string;
  systemPrompt: string;
  userMessage: string;
}): Promise<Response> {
  try {
    const rawStream = await streamAiResponse(config);
    return createSseResponse(rawStream);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ─── JSON Parsing ───

/**
 * Safely parses AI-generated JSON from streamed text.
 * Handles markdown code fences, partial matches, and malformed output.
 */
export function parseAiJson<T = unknown>(raw: string): T {
  // Strip markdown code fences
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  // Try direct parse first
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Fall through to regex extraction
  }

  // Extract JSON object or array
  const objMatch = cleaned.match(/(\{[\s\S]*\})/);
  const arrMatch = cleaned.match(/(\[[\s\S]*\])/);

  // Prefer whichever starts first in the string
  const match = objMatch && arrMatch
    ? (objMatch.index! < arrMatch.index! ? objMatch : arrMatch)
    : objMatch ?? arrMatch;

  if (!match) {
    throw new Error('No valid JSON found in AI response');
  }

  try {
    return JSON.parse(match[1]) as T;
  } catch (e) {
    throw new Error(`Failed to parse AI JSON: ${e instanceof Error ? e.message : 'Unknown'}`);
  }
}

// ─── SSE Client Parsing ───

/**
 * Reads an SSE stream from a fetch Response and accumulates text.
 * For use in client-side pages. Calls onChunk for each text fragment.
 * Returns the full accumulated text.
 */
export async function readSseStream(
  res: Response,
  onChunk?: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((err as { error?: string }).error ?? `Request failed: ${res.status}`);
  }

  if (!res.body) throw new Error('No response body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  try {
    while (true) {
      if (signal?.aborted) {
        reader.cancel();
        break;
      }
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data) as { text?: string; error?: string };
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.text) {
            fullText += parsed.text;
            onChunk?.(parsed.text);
          }
        } catch (e) {
          if (e instanceof Error && e.message !== 'Unexpected end of JSON input') throw e;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullText;
}
