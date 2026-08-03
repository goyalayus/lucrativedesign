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

async function hasValidImageSignature(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());

  if (file.type === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (file.type === 'image/png') {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (byte, index) => bytes[index] === byte,
    );
  }

  if (file.type === 'image/gif') {
    return (
      String.fromCharCode(...bytes.slice(0, 6)) === 'GIF87a' ||
      String.fromCharCode(...bytes.slice(0, 6)) === 'GIF89a'
    );
  }

  if (file.type === 'image/webp') {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
    );
  }

  if (file.type === 'image/avif') {
    const fileType = String.fromCharCode(...bytes.slice(4, 8));
    const brands = String.fromCharCode(...bytes.slice(8, 32));
    return fileType === 'ftyp' && /avif|avis/.test(brands);
  }

  return false;
}

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

  if (!(await hasValidImageSignature(file))) {
    return errorResponse(
      'The uploaded file does not match its image type.',
      415,
    );
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
