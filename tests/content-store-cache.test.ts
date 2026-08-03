import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

const getOptions: Array<Record<string, unknown>> = [];

mock.module('@vercel/blob', {
  exports: {
    BlobPreconditionFailedError: class BlobPreconditionFailedError extends Error {},
    get: async (_pathname: string, options: Record<string, unknown>) => {
      getOptions.push(options);

      const { defaultSiteContent } = await import(
        '../src/lib/content/defaultContent.ts'
      );

      return {
        statusCode: 200,
        stream: new Response(JSON.stringify(defaultSiteContent)).body,
        blob: {
          etag: 'test-etag',
        },
      };
    },
    list: async () => ({ blobs: [], hasMore: false }),
    put: async () => {
      throw new Error('put should not be called by this test');
    },
  },
});

const { readSiteContentWithSource } = await import(
  '../api/_lib/content-store.ts'
);

test('reads Blob content from origin instead of a stale CDN response', async () => {
  const previousToken = process.env.BLOB_READ_WRITE_TOKEN;
  process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
  getOptions.length = 0;

  try {
    const result = await readSiteContentWithSource({ strict: true });

    assert.equal(result.source, 'blob-current');
    assert.equal(getOptions.length, 1);
    assert.equal(getOptions[0]?.useCache, false);
  } finally {
    if (previousToken === undefined) {
      delete process.env.BLOB_READ_WRITE_TOKEN;
    } else {
      process.env.BLOB_READ_WRITE_TOKEN = previousToken;
    }
  }
});
