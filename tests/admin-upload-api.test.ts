import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { mock } from 'node:test';

mock.module('@aws-sdk/client-s3', {
  exports: {
    GetObjectCommand: class GetObjectCommand {
      constructor(readonly input: Record<string, unknown>) {}
    },
    PutObjectCommand: class PutObjectCommand {
      constructor(readonly input: Record<string, unknown>) {}
    },
    S3Client: class S3Client {},
  },
});

mock.module('@aws-sdk/s3-request-presigner', {
  exports: {
    getSignedUrl: async () => 'https://signed.example/upload',
  },
});

const { POST: login } = await import('../api/admin/login.ts');
const { POST: prepareUpload } = await import('../api/admin/upload-url.ts');

const password = 's3-upload-test-password';

afterEach(() => {
  for (const key of [
    'ADMIN_PASSWORD',
    'ADMIN_SESSION_SECRET',
    'AWS_REGION',
    'S3_BUCKET_NAME',
    'S3_PUBLIC_BASE_URL',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
  ]) {
    delete process.env[key];
  }
});

async function getCookie(): Promise<string> {
  process.env.ADMIN_PASSWORD = password;
  process.env.ADMIN_SESSION_SECRET = 's3-upload-test-secret';

  const response = await login(
    new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    }),
  );

  assert.equal(response.status, 200);
  return response.headers.get('set-cookie')?.split(';', 1)[0] ?? '';
}

test('prepares a direct S3 upload for a file larger than 4 MB', async () => {
  process.env.AWS_REGION = 'ap-south-1';
  process.env.S3_BUCKET_NAME = 'lucrative-design-assets-test';
  process.env.S3_PUBLIC_BASE_URL =
    'https://lucrative-design-assets-test.s3.ap-south-1.amazonaws.com';
  process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
  process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';

  const response = await prepareUpload(
    new Request('http://localhost/api/admin/upload-url', {
      method: 'POST',
      headers: {
        cookie: await getCookie(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        filename: 'large-render.jpg',
        contentType: 'image/jpeg',
        size: 6 * 1024 * 1024,
        folder: 'projects',
      }),
    }),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.uploadUrl, 'https://signed.example/upload');
  assert.match(payload.url, /\/assets\/projects\/\d+-large-render\.jpg$/);
});

test('rejects upload preparation without an admin session', async () => {
  process.env.ADMIN_PASSWORD = password;
  process.env.ADMIN_SESSION_SECRET = 's3-upload-test-secret';

  const response = await prepareUpload(
    new Request('http://localhost/api/admin/upload-url', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        filename: 'large-render.jpg',
        contentType: 'image/jpeg',
        size: 6 * 1024 * 1024,
        folder: 'projects',
      }),
    }),
  );

  assert.equal(response.status, 401);
});
