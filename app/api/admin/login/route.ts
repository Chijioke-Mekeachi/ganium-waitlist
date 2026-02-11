import { NextResponse } from 'next/server';
import { createToken } from '@/lib/admin/jwt';
import { getAdminConfig } from '@/lib/admin/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { username?: string; password?: string };
    const { username, password, jwtSecret, jwtTtlSeconds } = getAdminConfig();

    if (body.username !== username || body.password !== password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = createToken({ sub: 'admin', secret: jwtSecret, expiresInSeconds: jwtTtlSeconds });
    return NextResponse.json({ token });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

