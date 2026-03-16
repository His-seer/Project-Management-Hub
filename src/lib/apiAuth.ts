import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple API key guard for all server routes.
 * In production, set API_SECRET to a long random string in your env vars.
 * In development, it is skipped when API_SECRET is not set.
 *
 * The client must send:  Authorization: Bearer <API_SECRET>
 * Or the header:         x-api-secret: <API_SECRET>
 */
export function requireApiSecret(req: NextRequest): NextResponse | null {
  const secret = process.env.API_SECRET;

  // If not configured (local dev), allow through
  if (!secret) return null;

  const authHeader = req.headers.get('authorization');
  const secretHeader = req.headers.get('x-api-secret');

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : secretHeader;

  if (token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null; // authorized
}
