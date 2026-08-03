import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

const sentCommands: Array<{ name: string; input: Record<string, unknown> }> = [];

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
    S3Client: class S3Client {
      async send(command: { constructor: { name: string }; input: Record<string, unknown> }) {
        sentCommands.push({ name: command.constructor.name, input: command.input });

        if (command.constructor.name === 'GetObjectCommand') {
          return {
            Body: {
              transformToString: async () =>
                JSON.stringify({
                  settings: {},
                  projects: [],
                  updatedAt: '2026-08-04T00:00:00.000Z',
                }),
            },
            ETag: '"etag-1"',
          };
        }

        return {};
      }
    },
  },
});

const {
  getContentStorageInfo,
  readSiteContentWithSource,
  writeSiteContent,
} = await import('../api/_lib/content-store.ts');

test('reports S3 storage when the required variables exist', () => {
  process.env.AWS_REGION = 'ap-south-1';
  process.env.S3_BUCKET_NAME = 'lucrative-design-assets-test';
  process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
  process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';

  assert.equal(getContentStorageInfo().mode, 's3');
});

test('reads authoritative S3 JSON and returns its ETag revision', async () => {
  sentCommands.length = 0;
  process.env.AWS_REGION = 'ap-south-1';
  process.env.S3_BUCKET_NAME = 'lucrative-design-assets-test';
  process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
  process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';

  const result = await readSiteContentWithSource({ strict: true });

  assert.equal(result.source, 's3-current');
  assert.deepEqual(result.storageRevision, {
    pathname: 'content/site-content-authoritative.json',
    etag: 'etag-1',
  });
  assert.equal(sentCommands[0]?.input.Key, 'content/site-content-authoritative.json');
});

test('writes S3 JSON with the previous ETag as a conditional write', async () => {
  sentCommands.length = 0;
  process.env.AWS_REGION = 'ap-south-1';
  process.env.S3_BUCKET_NAME = 'lucrative-design-assets-test';
  process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
  process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';

  await writeSiteContent(
    {
      settings: {},
      projects: [],
      updatedAt: '',
    },
    {
      pathname: 'content/site-content-authoritative.json',
      etag: 'etag-1',
    },
  );

  assert.equal(sentCommands[0]?.input.IfMatch, 'etag-1');
  assert.equal(sentCommands[0]?.input.ContentType, 'application/json; charset=utf-8');
});
