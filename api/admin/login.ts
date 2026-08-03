import {
  createSessionCookie,
  isAdminConfigured,
  verifyAdminPassword,
} from '../_lib/auth.js';
import { errorResponse, jsonResponse } from '../_lib/http.js';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  if (!isAdminConfigured()) {
    return errorResponse(
      'ADMIN_PASSWORD is not configured yet. Add it in your Vercel project settings first.',
      503,
    );
  }

  const body = await request.json().catch(() => null) as { password?: string } | null;
  const password = typeof body?.password === 'string'
    ? body.password.trim()
    : '';

  if (!password) {
    return errorResponse('Password is required.', 400);
  }

  if (!verifyAdminPassword(password)) {
    return errorResponse('Invalid password.', 401);
  }

  return jsonResponse(
    { ok: true },
    200,
    {
      'set-cookie': createSessionCookie(request),
    },
  );
}
