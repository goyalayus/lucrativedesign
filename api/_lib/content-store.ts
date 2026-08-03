import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  CURRENT_CONTENT_PATHNAME,
  getS3StorageConfig,
  isS3PreconditionFailure,
  readS3Content,
  writeS3Content,
} from './s3-storage.js';
import {
  cloneSiteContent,
  defaultSiteContent,
} from '../../src/lib/content/defaultContent.js';
import { normalizeSiteContent } from '../../src/lib/content/normalize.js';
import type { SiteContent } from '../../src/lib/content/types.js';

const LOCAL_CONTENT_FILE = path.join(process.cwd(), 'data', 'site-content.local.json');
const LOCAL_UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads', 'admin');

export type ContentStorageMode = 's3' | 'local' | 'unavailable';

export const CONTENT_STORAGE_ERROR_MESSAGE =
  'Persistent content storage is not configured. Add AWS_REGION and S3_BUCKET_NAME to the Vercel project.';
export const ASSET_STORAGE_ERROR_MESSAGE =
  'Persistent asset storage is not configured. Add AWS_REGION and S3_BUCKET_NAME to the Vercel project.';
const CONTENT_READ_ERROR_MESSAGE =
  'Persistent content storage could not be read right now. Verify the AWS S3 connection.';

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

export class ContentRevisionConflictError extends Error {
  constructor() {
    super('Content changed since you opened the admin dashboard. Reload before saving again.');
    this.name = 'ContentRevisionConflictError';
  }
}

export interface ContentStorageInfo {
  mode: ContentStorageMode;
  label: string;
  detail: string;
}

export interface SiteContentReadResult {
  content: SiteContent;
  source: 's3-current' | 'local-file' | 'default-content';
  storageRevision?: {
    pathname: string;
    etag: string;
  };
}

let contentWriteQueue = Promise.resolve();

export async function withContentWriteLock<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const previousWrite = contentWriteQueue;
  let releaseWrite!: () => void;

  contentWriteQueue = new Promise<void>((resolve) => {
    releaseWrite = resolve;
  });

  await previousWrite;

  try {
    return await operation();
  } finally {
    releaseWrite();
  }
}

function hasS3Config(): boolean {
  return Boolean(getS3StorageConfig());
}

function isVercelRuntime(): boolean {
  const environment = process.env.VERCEL_ENV;

  return (
    environment === 'production' ||
    environment === 'preview' ||
    (Boolean(process.env.VERCEL) && !environment)
  );
}

export function getContentStorageInfo(): ContentStorageInfo {
  if (hasS3Config()) {
    return {
      mode: 's3',
      label: 'AWS S3 storage',
      detail:
        'Paste public image URLs or upload files directly to AWS S3. Uploaded files persist in the dedicated S3 asset bucket for the live site.',
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
      'Changes save to a local JSON file here. Use public image URLs while working locally. Upload buttons appear automatically once S3 storage is available.',
  };
}

async function readLocalContent(): Promise<SiteContent | null> {
  try {
    const raw = await readFile(LOCAL_CONTENT_FILE, 'utf8');
    return normalizeSiteContent(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function readSiteContentWithSource(
  options: { strict?: boolean } = {},
): Promise<SiteContentReadResult> {
  if (hasS3Config()) {
    try {
      const result = await readS3Content(CURRENT_CONTENT_PATHNAME);

      if (result) {
        return {
          content: normalizeSiteContent(JSON.parse(result.payload)),
          source: 's3-current',
          storageRevision: {
            pathname: CURRENT_CONTENT_PATHNAME,
            etag: result.etag,
          },
        };
      }
    } catch {
      if (options.strict) {
        throw new ContentStorageReadError();
      }
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

export async function writeSiteContent(
  value: SiteContent,
  storageRevision?: SiteContentReadResult['storageRevision'],
): Promise<SiteContent> {
  const nextContent = normalizeSiteContent({
    ...value,
    updatedAt: new Date().toISOString(),
  });
  const payload = JSON.stringify(nextContent, null, 2);

  if (hasS3Config()) {
    try {
      await writeS3Content(
        storageRevision?.pathname ?? CURRENT_CONTENT_PATHNAME,
        payload,
        storageRevision?.etag,
      );
    } catch (error) {
      if (isS3PreconditionFailure(error)) {
        throw new ContentRevisionConflictError();
      }

      throw error;
    }

    return nextContent;
  }

  if (isVercelRuntime()) {
    throw new ContentStorageUnavailableError(CONTENT_STORAGE_ERROR_MESSAGE);
  }

  await mkdir(path.dirname(LOCAL_CONTENT_FILE), { recursive: true });
  await writeFile(LOCAL_CONTENT_FILE, payload, 'utf8');
  return nextContent;
}

export async function writeLocalAsset(file: File, folder: string): Promise<string> {
  const safeFolder = folder.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const safeFilename = (file.name || 'upload.bin').toLowerCase().replace(/[^a-z0-9.-]+/g, '-');
  const outputDir = path.join(LOCAL_UPLOAD_ROOT, safeFolder || 'projects');
  await mkdir(outputDir, { recursive: true });

  const localFilename = `${Date.now()}-${safeFilename}`;
  const outputPath = path.join(outputDir, localFilename);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(outputPath, bytes);
  return `/uploads/admin/${safeFolder || 'projects'}/${localFilename}`;
}
