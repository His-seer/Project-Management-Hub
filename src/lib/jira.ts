export interface JiraCredentials {
  baseUrl: string;
  email: string;
  apiToken: string;
}

export function jiraHeaders(creds: JiraCredentials) {
  const auth = Buffer.from(`${creds.email}:${creds.apiToken}`).toString('base64');
  return {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

export async function jiraFetch(
  creds: JiraCredentials,
  path: string,
  options: RequestInit = {}
) {
  const url = `${creds.baseUrl.replace(/\/$/, '')}/rest${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...jiraHeaders(creds), ...(options.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jira API ${res.status}: ${text}`);
  }
  return res.json();
}
