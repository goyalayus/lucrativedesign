import { requireAdmin } from '../_lib/auth.js';
import {
  getContentStorageInfo,
  readSiteContent,
  writeSiteContent,
} from '../_lib/content-store.js';
import { errorResponse, jsonResponse } from '../_lib/http.js';
import { normalizeSiteContent } from '../../src/lib/content/normalize.js';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  const unauthorizedResponse = requireAdmin(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const content = await readSiteContent();
  return jsonResponse({
    content,
    storage: getContentStorageInfo(),
  });
}

export async function PUT(request: Request): Promise<Response> {
  const unauthorizedResponse = requireAdmin(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return errorResponse('A JSON payload is required.', 400);
  }

  const savedContent = await writeSiteContent(normalizeSiteContent(body));
  return jsonResponse({
    content: savedContent,
    storage: getContentStorageInfo(),
  });
}
