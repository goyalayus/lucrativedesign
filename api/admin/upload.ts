import { requireAdmin } from '../_lib/auth.js';
import {
  ASSET_STORAGE_ERROR_MESSAGE,
  ContentStorageReadError,
  ContentStorageUnavailableError,
  uploadAsset,
} from '../_lib/content-store.js';
import { errorResponse, jsonResponse } from '../_lib/http.js';

export const runtime = 'nodejs';
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

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

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return errorResponse(
      'Only JPEG, PNG, GIF, WebP, and AVIF images can be uploaded.',
      415,
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return errorResponse('Images must be 4 MB or smaller.', 413);
  }

  try {
    const url = await uploadAsset(file, folder);
    return jsonResponse({ url });
  } catch (error) {
    if (
      error instanceof ContentStorageReadError ||
      error instanceof ContentStorageUnavailableError
    ) {
      return errorResponse(error.message || ASSET_STORAGE_ERROR_MESSAGE, 503);
    }

    return errorResponse('Unable to upload the image right now.', 503);
  }
}
