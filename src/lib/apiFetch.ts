/**
 * Thin wrapper around fetch that automatically adds the x-api-secret header
 * to all /api/* requests when NEXT_PUBLIC_API_SECRET is set.
 *
 * Usage: import apiFetch from '@/lib/apiFetch'
 *        const res = await apiFetch('/api/projects', { method: 'POST', ... })
 */
const apiFetch: typeof fetch = (input, init) => {
  const secret = process.env.NEXT_PUBLIC_API_SECRET;
  if (!secret) return fetch(input, init);

  const headers = new Headers(init?.headers);
  headers.set('x-api-secret', secret);

  return fetch(input, { ...init, headers });
};

export default apiFetch;
