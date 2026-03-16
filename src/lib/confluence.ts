export interface ConfluenceCredentials {
  baseUrl: string;
  email: string;
  apiToken: string;
}

export function confluenceHeaders(creds: ConfluenceCredentials) {
  const auth = Buffer.from(`${creds.email}:${creds.apiToken}`).toString('base64');
  return {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

export async function confluenceFetch(
  creds: ConfluenceCredentials,
  path: string,
  options: RequestInit = {}
) {
  const url = `${creds.baseUrl.replace(/\/$/, '')}/wiki/rest/api${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...confluenceHeaders(creds), ...(options.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Confluence API ${res.status}: ${text}`);
  }
  return res.json();
}
