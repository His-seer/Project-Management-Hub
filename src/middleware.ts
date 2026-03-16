import { NextRequest, NextResponse } from 'next/server';

/**
 * Edge middleware — protects all /api/* routes with an API secret.
 * Set API_SECRET in your environment (Vercel → Project Settings → Environment Variables).
 * In local development, leave API_SECRET unset to allow all requests through.
 *
 * Client-side fetch calls automatically include x-api-secret from the store.
 */
export function middleware(req: NextRequest) {
  const secret = process.env.API_SECRET;

  // Skip auth if secret not configured (local dev)
  if (!secret) return NextResponse.next();

  const authHeader = req.headers.get('authorization');
  const secretHeader = req.headers.get('x-api-secret');

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : secretHeader;

  if (token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
