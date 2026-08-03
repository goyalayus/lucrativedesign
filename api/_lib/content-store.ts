import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { get, list, put } from '@vercel/blob';
import {
  cloneSiteContent,
  defaultSiteContent,
} from '../../src/lib/content/defaultContent.js';
import { normalizeSiteContent } from '../../src/lib/content/normalize.js';
import type { SiteContent } from '../../src/lib/content/types.js';

const LEGACY_CONTENT_PATHNAME = 'content/site-content.json';
const CONTENT_PATH_PREFIX = 'content/site-content-';
const LOCAL_CONTENT_FILE = path.join(process.cwd(), 'data', 'site-content.local.json');
const LOCAL_UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads', 'admin');

export type ContentStorageMode = 'blob' | 'local' | 'unavailable';

export const CONTENT_STORAGE_ERROR_MESSAGE =
  'Persistent content storage is not configured. Add BLOB_READ_WRITE_TOKEN to the Vercel project.';
export const ASSET_STORAGE_ERROR_MESSAGE =
  'Persistent asset storage is not configured. Add BLOB_READ_WRITE_TOKEN to the Vercel project.';
const CONTENT_READ_ERROR_MESSAGE =
  'Persistent content storage could not be read right now. Verify the Vercel Blob connection.';

export class ContentStorageUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentStorageUnavailableError';
  }
}

export class ContentStorageReadError extends Error {
  constructor() {
    super(CONTENT_READ_ERROR_MESSAGE);
    this.name = 'ContentStorageReadError';
  }
}

export interface ContentStorageInfo {
  mode: ContentStorageMode;
  label: string;
  detail: string;
}

export interface SiteContentReadResult {
  content: SiteContent;
  source: 'blob-versioned' | 'blob-legacy' | 'local-file' | 'default-content';
}

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

export function getContentStorageInfo(): ContentStorageInfo {
  if (hasBlobToken()) {
    return {
      mode: 'blob',
      label: 'Vercel Blob storage',
      detail:
        'Paste public image URLs or upload files directly. Uploaded files persist in Vercel Blob for the live site.',
    };
  }

  if (isVercelRuntime()) {
    return {
      mode: 'unavailable',
      label: 'Persistent storage not configured',
      detail: CONTENT_STORAGE_ERROR_MESSAGE,
    };
  }

  return {
    mode: 'local',
    label: 'Local development storage',
    detail:
      'Changes save to a local JSON file here. Use public image URLs while working locally. Upload buttons appear automatically once Blob storage is available.',
  };
}

function sanitizeSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'asset';
}

function sanitizeFilename(value: string): string {
  const extension = path.extname(value).toLowerCase();
  const basename = path.basename(value, extension);
  const safeBase = sanitizeSegment(basename);
  const safeExtension = extension.replace(/[^a-z0-9.]/g, '');
  return `${safeBase}${safeExtension || '.bin'}`;
}

async function readLocalContent(): Promise<SiteContent | null> {
  try {
    const raw = await readFile(LOCAL_CONTENT_FILE, 'utf8');
    return normalizeSiteContent(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function readBlobContent(pathname: string): Promise<SiteContent | null> {
  const blob = await get(pathname, { access: 'public' });

  if (blob?.statusCode !== 200) {
    return null;
  }

  const payload = await new Response(blob.stream).text();
  return normalizeSiteContent(JSON.parse(payload));
}

function extractVersionTimestamp(pathname: string): number {
  const withoutPrefix = pathname.startsWith(CONTENT_PATH_PREFIX)
    ? pathname.slice(CONTENT_PATH_PREFIX.length)
    : pathname;
  const [rawTimestamp] = withoutPrefix.split('-', 1);
  const parsedTimestamp = Number.parseInt(rawTimestamp ?? '', 10);

  if (Number.isNaN(parsedTimestamp)) {
    return 0;
  }

  return parsedTimestamp;
}

async function findLatestVersionedContentPathname(): Promise<string | null> {
  let cursor: string | undefined;
  let latestBlob:
    | {
        pathname: string;
        versionTimestamp: number;
      }
    | null = null;

  do {
    const result = await list({
      prefix: CONTENT_PATH_PREFIX,
      cursor,
      limit: 1000,
    });

    for (const blob of result.blobs) {
      const versionTimestamp = extractVersionTimestamp(blob.pathname);

      if (
        !latestBlob ||
        versionTimestamp > latestBlob.versionTimestamp ||
        (
          versionTimestamp === latestBlob.versionTimestamp &&
          blob.pathname > latestBlob.pathname
        )
      ) {
        latestBlob = {
          pathname: blob.pathname,
          versionTimestamp,
        };
      }
    }

    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);

  return latestBlob?.pathname ?? null;
}

function createVersionedContentPathname(): string {
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return `${CONTENT_PATH_PREFIX}${Date.now()}-${randomSuffix}.json`;
}

export async function readSiteContentWithSource(
  options: { strict?: boolean } = {},
): Promise<SiteContentReadResult> {
  if (hasBlobToken()) {
    try {
      const latestVersionedPathname = await findLatestVersionedContentPathname();

      if (latestVersionedPathname) {
        const versionedContent = await readBlobContent(latestVersionedPathname);

        if (versionedContent) {
          return {
            content: versionedContent,
            source: 'blob-versioned',
          };
        }
      }

      const legacyContent = await readBlobContent(LEGACY_CONTENT_PATHNAME);

      if (legacyContent) {
        return {
          content: legacyContent,
          source: 'blob-legacy',
        };
      }
    } catch {
      if (options.strict) {
        throw new ContentStorageReadError();
      }

      // The public site keeps serving defaults during a temporary Blob outage.
    }
  }

  const localContent = await readLocalContent();

  if (localContent) {
    return {
      content: localContent,
      source: 'local-file',
    };
  }

  return {
    content: cloneSiteContent(defaultSiteContent),
    source: 'default-content',
  };
}

export async function readSiteContent(
  options: { strict?: boolean } = {},
): Promise<SiteContent> {
  const { content } = await readSiteContentWithSource(options);
  return content;
}

export async function writeSiteContent(value: SiteContent): Promise<SiteContent> {
  const nextContent = normalizeSiteContent({
    ...value,
    updatedAt: new Date().toISOString(),
  });
  const payload = JSON.stringify(nextContent, null, 2);

  if (hasBlobToken()) {
    await put(createVersionedContentPathname(), payload, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json; charset=utf-8',
    });

    return nextContent;
  }

  if (isVercelRuntime()) {
    throw new ContentStorageUnavailableError(CONTENT_STORAGE_ERROR_MESSAGE);
  }

  await mkdir(path.dirname(LOCAL_CONTENT_FILE), { recursive: true });
  await writeFile(LOCAL_CONTENT_FILE, payload, 'utf8');
  return nextContent;
}

export async function uploadAsset(file: File, folder: string): Promise<string> {
  const safeFolder = sanitizeSegment(folder);
  const safeFilename = sanitizeFilename(file.name || 'upload.bin');
  const pathname = `uploads/${safeFolder}/${Date.now()}-${safeFilename}`;

  if (hasBlobToken()) {
    const uploaded = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: file.type || undefined,
    });

    return uploaded.url;
  }

  if (isVercelRuntime()) {
    throw new ContentStorageUnavailableError(ASSET_STORAGE_ERROR_MESSAGE);
  }

  const outputDir = path.join(LOCAL_UPLOAD_ROOT, safeFolder);
  await mkdir(outputDir, { recursive: true });

  const localFilename = `${Date.now()}-${safeFilename}`;
  const outputPath = path.join(outputDir, localFilename);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(outputPath, bytes);

  return `/uploads/admin/${safeFolder}/${localFilename}`;
}
