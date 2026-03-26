/**
 * Server-side URL validation — verifies that URLs are reachable
 * before returning them to users.
 */

export interface UrlValidationResult {
  url: string;
  valid: boolean;
  status?: number;
  redirectUrl?: string;
}

/**
 * Validate a single URL via HEAD request with fallback to GET.
 * Times out after `timeoutMs` to avoid blocking.
 */
export async function validateUrl(
  url: string,
  timeoutMs = 5000
): Promise<UrlValidationResult> {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { url, valid: false };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // HEAD first (lighter)
      let res = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PMHub-LinkChecker/1.0)',
        },
      });

      // Some servers reject HEAD — retry with GET
      if (res.status === 405 || res.status === 403) {
        res = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PMHub-LinkChecker/1.0)',
          },
        });
      }

      clearTimeout(timer);

      const valid = res.ok || res.status === 301 || res.status === 302;
      return {
        url,
        valid,
        status: res.status,
        redirectUrl: res.redirected ? res.url : undefined,
      };
    } catch {
      clearTimeout(timer);
      return { url, valid: false };
    }
  } catch {
    return { url, valid: false };
  }
}

/**
 * Validate multiple URLs concurrently with a concurrency limit.
 * Returns results in the same order as input.
 */
export async function validateUrls(
  urls: string[],
  options: { concurrency?: number; timeoutMs?: number } = {}
): Promise<UrlValidationResult[]> {
  const { concurrency = 5, timeoutMs = 5000 } = options;
  const results: UrlValidationResult[] = new Array(urls.length);
  let cursor = 0;

  async function worker() {
    while (cursor < urls.length) {
      const idx = cursor++;
      results[idx] = await validateUrl(urls[idx], timeoutMs);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, urls.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}
