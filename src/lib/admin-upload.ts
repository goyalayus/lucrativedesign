interface UploadRequestResponse {
  uploadUrl?: string;
  url?: string;
}

type UploadFetch = typeof fetch;

export class AdminUploadError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminUploadError';
    this.status = status;
  }
}

export async function uploadFileToS3(
  file: File,
  folder: string,
  fetchImpl: UploadFetch = fetch,
): Promise<string> {
  const prepareResponse = await fetchImpl('/api/admin/upload-url', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      size: file.size,
      folder,
    }),
  });

  if (!prepareResponse.ok) {
    throw new AdminUploadError(
      await readUploadError(prepareResponse),
      prepareResponse.status,
    );
  }

  const prepared = await prepareResponse.json() as UploadRequestResponse;

  if (!prepared.uploadUrl || !prepared.url) {
    throw new Error('The S3 upload response was incomplete.');
  }

  const uploadResponse = await fetchImpl(prepared.uploadUrl, {
    method: 'PUT',
    headers: {
      'content-type': file.type,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new AdminUploadError(
      'The image could not be uploaded to S3.',
      uploadResponse.status,
    );
  }

  return prepared.url;
}

async function readUploadError(response: Response): Promise<string> {
  try {
    const payload = await response.json() as { message?: unknown };

    if (typeof payload.message === 'string' && payload.message) {
      return payload.message;
    }
  } catch {
    // Use the status fallback below when the server did not return JSON.
  }

  return `Request failed with status ${response.status}.`;
}
