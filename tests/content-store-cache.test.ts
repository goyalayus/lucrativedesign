import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

const getRequests: Array<{
  pathname: string;
  options: Record<string, unknown>;
}> = [];

mock.module('@vercel/blob', {
  exports: {
    BlobPreconditionFailedError: class BlobPreconditionFailedError extends Error {},
    get: async (pathname: string, options: Record<string, unknown>) => {
      getRequests.push({ pathname, options });

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
  process.env.BLOB_READ_WRITE_TOKEN = 'test_token_x_store123';
  getRequests.length = 0;

  try {
    const result = await readSiteContentWithSource({ strict: true });

    assert.equal(result.source, 'blob-current');
    assert.equal(getRequests.length, 1);
    assert.match(
      getRequests[0]?.pathname ?? '',
      /^https:\/\/store123\.public\.blob\.vercel-storage\.com\/content\/site-content-authoritative\.json\?cache=/,
    );
    assert.equal(getRequests[0]?.options.useCache, undefined);
  } finally {
    if (previousToken === undefined) {
      delete process.env.BLOB_READ_WRITE_TOKEN;
    } else {
      process.env.BLOB_READ_WRITE_TOKEN = previousToken;
    }
  }
});
