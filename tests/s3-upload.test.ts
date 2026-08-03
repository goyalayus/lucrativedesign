import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

mock.module('@aws-sdk/client-s3', {
  exports: {
    GetObjectCommand: class GetObjectCommand {
      readonly input: Record<string, unknown>;

      constructor(input: Record<string, unknown>) {
        this.input = input;
      }
    },
    PutObjectCommand: class PutObjectCommand {
      readonly input: Record<string, unknown>;

      constructor(input: Record<string, unknown>) {
        this.input = input;
      }
    },
    S3Client: class S3Client {},
  },
});

mock.module('@aws-sdk/s3-request-presigner', {
  exports: {
    getSignedUrl: async () => 'https://signed.example/upload',
  },
});

const { createUploadRequest } = await import('../api/_lib/s3-storage.ts');

test('creates a presigned S3 upload for an image larger than 4 MB', async () => {
  process.env.AWS_REGION = 'ap-south-1';
  process.env.S3_BUCKET_NAME = 'lucrative-design-assets-test';
  process.env.S3_PUBLIC_BASE_URL =
    'https://lucrative-design-assets-test.s3.ap-south-1.amazonaws.com';
  process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
  process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';

  const result = await createUploadRequest({
    filename: 'large-architecture-render.jpg',
    contentType: 'image/jpeg',
    size: 6 * 1024 * 1024,
    folder: 'projects/large-project',
  });

  assert.equal(result.uploadUrl, 'https://signed.example/upload');
  assert.match(result.key, /^assets\/projects-large-project\/\d+-large-architecture-render\.jpg$/);
  assert.match(result.url, /\/assets\/projects-large-project\/\d+-large-architecture-render\.jpg$/);
});

test('rejects unsupported image types', async () => {
  await assert.rejects(
    () =>
      createUploadRequest({
        filename: 'not-an-image.pdf',
        contentType: 'application/pdf',
        size: 10,
        folder: 'projects',
      }),
    /Only JPEG, PNG, GIF, WebP, and AVIF images can be uploaded/,
  );
});
