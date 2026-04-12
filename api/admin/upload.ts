import { requireAdmin } from '../_lib/auth.js';
import { uploadAsset } from '../_lib/content-store.js';
import { errorResponse, jsonResponse } from '../_lib/http.js';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  const unauthorizedResponse = requireAdmin(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return errorResponse('A multipart form payload is required.', 400);
  }

  const file = formData.get('file');
  const folder = String(formData.get('folder') ?? 'projects');

  if (!(file instanceof File)) {
    return errorResponse('A file is required.', 400);
  }

  const url = await uploadAsset(file, folder);
  return jsonResponse({ url });
}
