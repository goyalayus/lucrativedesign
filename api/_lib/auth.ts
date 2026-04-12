import { createHmac, timingSafeEqual } from 'node:crypto';
import { errorResponse } from './http.js';

const ADMIN_COOKIE_NAME = 'lucrative_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function getAdminPassword(): string | null {
  return process.env.ADMIN_PASSWORD ?? null;
}

function getSessionSecret(): string | null {
  const password = getAdminPassword();

  if (!password) {
    return null;
  }

  return process.env.ADMIN_SESSION_SECRET ?? `session:${password}`;
}

function createSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((cookies, part) => {
    const [name, ...rest] = part.trim().split('=');

    if (!name) {
      return cookies;
    }

    cookies[name] = rest.join('=');
    return cookies;
  }, {});
}

export function isAdminConfigured(): boolean {
  return Boolean(getAdminPassword());
}

export function verifyAdminPassword(password: string): boolean {
  const expected = getAdminPassword();

  if (!expected) {
    return false;
  }

  const providedBuffer = Buffer.from(password);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

function buildCookieAttributes(request: Request): string {
  const { protocol } = new URL(request.url);
  const secure = protocol === 'https:' ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

export function createSessionCookie(request: Request): string {
  const secret = getSessionSecret();

  if (!secret) {
    throw new Error('ADMIN_PASSWORD is not configured.');
  }

  const payload = Buffer.from(
    JSON.stringify({
      exp: Date.now() + SESSION_TTL_SECONDS * 1000,
    }),
  ).toString('base64url');

  const signature = createSignature(payload, secret);
  return `${ADMIN_COOKIE_NAME}=${payload}.${signature}; ${buildCookieAttributes(request)}`;
}

export function clearSessionCookie(request: Request): string {
  const { protocol } = new URL(request.url);
  const secure = protocol === 'https:' ? '; Secure' : '';
  return `${ADMIN_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

function isSessionValid(token: string): boolean {
  const secret = getSessionSecret();

  if (!secret) {
    return false;
  }

  const [payload, signature] = token.split('.');

  if (!payload || !signature) {
    return false;
  }

  const expectedSignature = createSignature(payload, secret);

  if (
    Buffer.byteLength(signature) !== Buffer.byteLength(expectedSignature) ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    return false;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      exp?: number;
    };

    return typeof parsed.exp === 'number' && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export function requireAdmin(request: Request): Response | null {
  if (!isAdminConfigured()) {
    return errorResponse(
      'ADMIN_PASSWORD is not configured yet. Add it in your Vercel project settings first.',
      503,
    );
  }

  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies[ADMIN_COOKIE_NAME];

  if (!token || !isSessionValid(token)) {
    return errorResponse('Not authenticated.', 401);
  }

  return null;
}
