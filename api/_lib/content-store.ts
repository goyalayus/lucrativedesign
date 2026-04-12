import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { put, get } from '@vercel/blob';
import {
  cloneSiteContent,
  defaultSiteContent,
} from '../../src/lib/content/defaultContent.js';
import { normalizeSiteContent } from '../../src/lib/content/normalize.js';
import type { SiteContent } from '../../src/lib/content/types.js';

const CONTENT_PATHNAME = 'content/site-content.json';
const LOCAL_CONTENT_FILE = path.join(process.cwd(), 'data', 'site-content.local.json');
const LOCAL_UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads', 'admin');

export type ContentStorageMode = 'blob' | 'local';

export interface ContentStorageInfo {
  mode: ContentStorageMode;
  label: string;
  detail: string;
}

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
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

export async function readSiteContent(): Promise<SiteContent> {
  if (hasBlobToken()) {
    try {
      const blob = await get(CONTENT_PATHNAME, { access: 'public' });

      if (blob?.statusCode === 200) {
        const payload = await new Response(blob.stream).text();
        return normalizeSiteContent(JSON.parse(payload));
      }
    } catch {
      // Fall back to local data or defaults.
    }
  }

  const localContent = await readLocalContent();
  return localContent ?? cloneSiteContent(defaultSiteContent);
}

export async function writeSiteContent(value: SiteContent): Promise<SiteContent> {
  const nextContent = normalizeSiteContent({
    ...value,
    updatedAt: new Date().toISOString(),
  });
  const payload = JSON.stringify(nextContent, null, 2);

  if (hasBlobToken()) {
    await put(CONTENT_PATHNAME, payload, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json; charset=utf-8',
    });

    return nextContent;
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

  const outputDir = path.join(LOCAL_UPLOAD_ROOT, safeFolder);
  await mkdir(outputDir, { recursive: true });

  const localFilename = `${Date.now()}-${safeFilename}`;
  const outputPath = path.join(outputDir, localFilename);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(outputPath, bytes);

  return `/uploads/admin/${safeFolder}/${localFilename}`;
}
