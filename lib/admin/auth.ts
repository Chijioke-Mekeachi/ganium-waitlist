import { verifyToken } from '@/lib/admin/jwt';

export function getAdminConfig() {
  return {
    username: process.env.ADMIN_USERNAME ?? 'admin',
    password: process.env.ADMIN_PASSWORD ?? 'admin123',
    jwtSecret: process.env.ADMIN_JWT_SECRET ?? 'dev-waitlist-secret',
    jwtTtlSeconds: Number(process.env.ADMIN_JWT_TTL_SECONDS ?? 60 * 60 * 12),
  };
}

export function requireAdminBearer(authHeader: string | null | undefined) {
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Missing token');
  const token = authHeader.slice('Bearer '.length).trim();
  const { jwtSecret } = getAdminConfig();
  const payload = verifyToken(token, jwtSecret);
  if (payload.sub !== 'admin') throw new Error('Invalid token');
  return true;
}

