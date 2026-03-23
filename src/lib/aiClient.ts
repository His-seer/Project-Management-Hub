/**
 * Gemini AI streaming client.
 * Handles SSE streaming from Google's Generative Language API.
 */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_TIMEOUT = 60_000; // 60s

export interface AiRequestConfig {
  model: string;
  systemPrompt: string;
  userMessage: string;
  /** Optional timeout in ms (default 60s) */
  timeout?: number;
}

export async function streamAiResponse(config: AiRequestConfig): Promise<ReadableStream> {
  const { model, systemPrompt, userMessage, timeout = DEFAULT_TIMEOUT } = config;

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY environment variable is not set');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let response: globalThis.Response;
  try {
    response = await fetch(`${GEMINI_BASE}/${model}:streamGenerateContent?alt=sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: 8192 },
      }),
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Gemini request timed out after ${timeout / 1000}s`);
    }
    throw err;
  }

  if (!response.ok) {
    clearTimeout(timeoutId);
    const body = await response.text().catch(() => 'No response body');
    throw new Error(`Gemini API error ${response.status}: ${body.slice(0, 200)}`);
  }

  return new ReadableStream({
    async start(ctrl) {
      const encoder = new TextEncoder();
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data) as {
                  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
                };
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) ctrl.enqueue(encoder.encode(text));
              } catch {
                // skip malformed SSE lines
              }
            }
          }
        }
        ctrl.close();
      } catch (err) {
        ctrl.error(err);
      } finally {
        clearTimeout(timeoutId);
      }
    },
  });
}
