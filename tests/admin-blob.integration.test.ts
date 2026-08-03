import assert from 'node:assert/strict';
import { test } from 'node:test';

import { del, list } from '@vercel/blob';
import {
  cloneSiteContent,
  defaultSiteContent,
} from '../src/lib/content/defaultContent.ts';
import {
  ContentRevisionConflictError,
  readSiteContentWithSource,
  writeSiteContent,
} from '../api/_lib/content-store.ts';

const CONTENT_PREFIX = 'content/';
const integrationEnabled =
  process.env.ADMIN_BLOB_INTEGRATION === '1' &&
  Boolean(process.env.BLOB_READ_WRITE_TOKEN);

test(
  'round-trips admin content through Vercel Blob and rejects stale ETags',
  { skip: integrationEnabled ? false : 'Set ADMIN_BLOB_INTEGRATION=1 with BLOB_READ_WRITE_TOKEN.' },
  async () => {
    const before = await list({ prefix: CONTENT_PREFIX, limit: 1000 });

    if (before.blobs.length > 0) {
      return;
    }

    let createdPathnames: string[] = [];

    try {
      const initial = await readSiteContentWithSource({ strict: true });
      const first = cloneSiteContent(defaultSiteContent);
      first.settings.footerNote = 'BLOB_INTEGRATION_FIRST';
      const competing = cloneSiteContent(defaultSiteContent);
      competing.settings.footerNote = 'BLOB_INTEGRATION_COMPETING';

      const firstSaveResults = await Promise.all(
        [first, competing].map((content) =>
          writeSiteContent(content, initial.storageRevision).then(
            () => null,
            (error: unknown) => error,
          ),
        ),
      );

      assert.equal(
        firstSaveResults.filter((result) => result === null).length,
        1,
      );
      assert.equal(
        firstSaveResults.filter(
          (result) => result instanceof ContentRevisionConflictError,
        ).length,
        1,
      );

      const current = await readSiteContentWithSource({ strict: true });
      const second = cloneSiteContent(defaultSiteContent);
      second.settings.footerNote = 'BLOB_INTEGRATION_SECOND';
      await writeSiteContent(second, current.storageRevision);

      await assert.rejects(
        writeSiteContent(first, current.storageRevision),
        (error: unknown) => error instanceof ContentRevisionConflictError,
      );

      const reread = await readSiteContentWithSource({ strict: true });
      assert.equal(reread.source, 'blob-current');
      assert.equal(reread.content.settings.footerNote, 'BLOB_INTEGRATION_SECOND');
      assert.ok(reread.storageRevision?.etag);

      const after = await list({ prefix: CONTENT_PREFIX, limit: 1000 });
      createdPathnames = after.blobs
        .map((blob) => blob.pathname)
        .filter(
          (pathname) =>
            !before.blobs.some((blob) => blob.pathname === pathname),
        );
    } finally {
      if (createdPathnames.length > 0) {
        await del(createdPathnames);
      }
    }
  },
);
