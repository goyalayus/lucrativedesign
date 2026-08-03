import { requireAdmin } from '../_lib/auth.js';
import {
  ContentRevisionConflictError,
  ContentStorageReadError,
  ContentStorageUnavailableError,
  getContentStorageInfo,
  readSiteContent,
  readSiteContentWithSource,
  withContentWriteLock,
  writeSiteContent,
} from '../_lib/content-store.js';
import { errorResponse, jsonResponse } from '../_lib/http.js';
import { normalizeSiteContent } from '../../src/lib/content/normalize.js';
import { isSiteContentPayload } from '../../src/lib/content/validation.js';

export const runtime = 'nodejs';

function storageErrorResponse(error: unknown, fallbackMessage: string): Response {
  if (
    error instanceof ContentStorageReadError ||
    error instanceof ContentStorageUnavailableError
  ) {
    return errorResponse(error.message, 503);
  }

  return errorResponse(fallbackMessage, 503);
}

export async function GET(request: Request): Promise<Response> {
  const unauthorizedResponse = requireAdmin(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const storage = getContentStorageInfo();

  if (storage.mode === 'unavailable') {
    return errorResponse(storage.detail, 503);
  }

  try {
    const content = await readSiteContent({ strict: true });
    return jsonResponse({
      content,
      storage,
    });
  } catch (error) {
    return storageErrorResponse(
      error,
      'Unable to read site content right now.',
    );
  }
}

export async function PUT(request: Request): Promise<Response> {
  const unauthorizedResponse = requireAdmin(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const body = await request.json().catch(() => null);

  if (!isSiteContentPayload(body)) {
    return errorResponse('A valid site content payload is required.', 400);
  }

  const requestedRevision = request.headers.get('if-match')?.trim();

  if (!requestedRevision) {
    return errorResponse(
      'A content revision is required to save. Reload the admin dashboard and try again.',
      428,
    );
  }

  try {
    const savedContent = await withContentWriteLock(async () => {
      const currentSnapshot = await readSiteContentWithSource({ strict: true });

      if (currentSnapshot.content.updatedAt !== requestedRevision) {
        return null;
      }

      return writeSiteContent(
        normalizeSiteContent(body),
        currentSnapshot.storageRevision,
      );
    });

    if (!savedContent) {
      return errorResponse(
        'Content changed since you opened the admin dashboard. Reload before saving again.',
        409,
      );
    }

    return jsonResponse({
      content: savedContent,
      storage: getContentStorageInfo(),
    });
  } catch (error) {
    if (error instanceof ContentRevisionConflictError) {
      return errorResponse(error.message, 409);
    }

    return storageErrorResponse(
      error,
      'Unable to save site content right now.',
    );
  }
}
