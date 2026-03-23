export interface AiRequestConfig {
  model: string;
  systemPrompt: string;
  userMessage: string;
}

export async function streamAiResponse(config: AiRequestConfig): Promise<ReadableStream> {
  const { model, systemPrompt, userMessage } = config;

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY environment variable is not set');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: 8192 },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Google API error: ${response.status} ${await response.text()}`);
  }

  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
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
              if (text) controller.enqueue(encoder.encode(text));
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      }
      controller.close();
    },
  });
}
