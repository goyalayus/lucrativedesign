import { clearSessionCookie } from '../_lib/auth.js';
import { jsonResponse } from '../_lib/http.js';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  return jsonResponse(
    { ok: true },
    200,
    {
      'set-cookie': clearSessionCookie(request),
    },
  );
}
