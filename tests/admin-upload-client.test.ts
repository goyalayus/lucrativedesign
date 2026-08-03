import assert from 'node:assert/strict';
import { test } from 'node:test';

const { uploadFileToS3 } = await import('../src/lib/admin-upload.ts');

test('requests a presigned URL and uploads the file directly to S3', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const file = new File(['large image'], 'render.jpg', { type: 'image/jpeg' });
  const fetchMock = async (url: string | URL, init?: RequestInit): Promise<Response> => {
    requests.push({ url: String(url), init });

    if (requests.length === 1) {
      return new Response(
        JSON.stringify({
          uploadUrl: 'https://signed.example/upload',
          url: 'https://assets.example/assets/projects/123-render.jpg',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }

    return new Response(null, { status: 200 });
  };

  const result = await uploadFileToS3(file, 'projects', fetchMock);

  assert.equal(result, 'https://assets.example/assets/projects/123-render.jpg');
  assert.equal(requests[0]?.url, '/api/admin/upload-url');
  assert.equal(requests[0]?.init?.method, 'POST');
  assert.deepEqual(JSON.parse(String(requests[0]?.init?.body)), {
    filename: 'render.jpg',
    contentType: 'image/jpeg',
    size: file.size,
    folder: 'projects',
  });
  assert.equal(requests[1]?.url, 'https://signed.example/upload');
  assert.equal(requests[1]?.init?.method, 'PUT');
  assert.equal(
    new Headers(requests[1]?.init?.headers).get('content-type'),
    'image/jpeg',
  );
  assert.equal(requests[1]?.init?.body, file);
});
