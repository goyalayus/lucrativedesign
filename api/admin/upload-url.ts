import { requireAdmin } from '../_lib/auth.js';
import {
  createUploadRequest,
  S3StorageUnavailableError,
  S3UploadValidationError,
} from '../_lib/s3-storage.js';
import { errorResponse, jsonResponse } from '../_lib/http.js';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  const unauthorizedResponse = requireAdmin(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const body = await request.json().catch(() => null) as {
    filename?: unknown;
    contentType?: unknown;
    size?: unknown;
    folder?: unknown;
  } | null;

  if (
    !body ||
    typeof body.filename !== 'string' ||
    typeof body.contentType !== 'string' ||
    typeof body.size !== 'number' ||
    typeof body.folder !== 'string'
  ) {
    return errorResponse('Filename, content type, size, and folder are required.', 400);
  }

  try {
    return jsonResponse(
      await createUploadRequest({
        filename: body.filename,
        contentType: body.contentType,
        size: body.size,
        folder: body.folder,
      }),
    );
  } catch (error) {
    if (error instanceof S3UploadValidationError) {
      return errorResponse(error.message, 413);
    }

    if (error instanceof S3StorageUnavailableError) {
      return errorResponse(error.message, 503);
    }

    return errorResponse('Unable to prepare the image upload right now.', 503);
  }
}
