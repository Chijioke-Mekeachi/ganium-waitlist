import crypto from 'node:crypto';

function base64url(input: string | Buffer) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlJson(obj: unknown) {
  return base64url(JSON.stringify(obj));
}

function signHmacSha256(message: string, secret: string) {
  return base64url(crypto.createHmac('sha256', secret).update(message).digest());
}

function base64urlDecodeToString(b64url: string) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (b64.length % 4)) % 4;
  return Buffer.from(b64 + '='.repeat(padLen), 'base64').toString('utf8');
}

export function createToken(opts: { sub: string; secret: string; expiresInSeconds: number }) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = { sub: opts.sub, iat: now, exp: now + opts.expiresInSeconds };
  const head = base64urlJson(header);
  const body = base64urlJson(payload);
  const unsigned = `${head}.${body}`;
  const sig = signHmacSha256(unsigned, opts.secret);
  return `${unsigned}.${sig}`;
}

export function verifyToken(token: string, secret: string) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const [head, body, sig] = parts;
  const unsigned = `${head}.${body}`;
  const expected = signHmacSha256(unsigned, secret);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) throw new Error('Invalid token');
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) throw new Error('Invalid token');
  const payload = JSON.parse(base64urlDecodeToString(body)) as { sub?: string; exp?: number };
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= now) throw new Error('Token expired');
  if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('Invalid token');
  return payload;
}

