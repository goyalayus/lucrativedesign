import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const CURRENT_CONTENT_PATHNAME = 'content/site-content-authoritative.json';
export const DEFAULT_MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export interface S3StorageConfig {
  bucket: string;
  region: string;
  publicBaseUrl: string;
}

export interface S3UploadRequestInput {
  filename: string;
  contentType: string;
  size: number;
  folder: string;
}

export class S3StorageUnavailableError extends Error {
  constructor(message = 'AWS S3 storage is not configured.') {
    super(message);
    this.name = 'S3StorageUnavailableError';
  }
}

export class S3UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'S3UploadValidationError';
  }
}

function readMaxUploadBytes(): number {
  const configured = Number.parseInt(process.env.S3_MAX_UPLOAD_BYTES ?? '', 10);

  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_MAX_UPLOAD_BYTES;
}

function sanitizeSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'asset';
}

function sanitizeFilename(value: string): string {
  const lastDot = value.lastIndexOf('.');
  const extension = lastDot >= 0 ? value.slice(lastDot).toLowerCase() : '';
  const basename = lastDot >= 0 ? value.slice(0, lastDot) : value;
  const safeExtension = extension.replace(/[^a-z0-9.]/g, '');

  return `${sanitizeSegment(basename)}${safeExtension || '.bin'}`;
}

function normalizedPublicBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

export function getS3StorageConfig(): S3StorageConfig | null {
  const bucket = process.env.S3_BUCKET_NAME?.trim();
  const region = process.env.AWS_REGION?.trim();

  if (!bucket || !region) {
    return null;
  }

  const publicBaseUrl =
    process.env.S3_PUBLIC_BASE_URL?.trim() ||
    `https://${bucket}.s3.${region}.amazonaws.com`;

  return {
    bucket,
    region,
    publicBaseUrl: normalizedPublicBaseUrl(publicBaseUrl),
  };
}

function getS3Client(config: S3StorageConfig): S3Client {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const sessionToken = process.env.AWS_SESSION_TOKEN?.trim();

  return new S3Client({
    region: config.region,
    ...(accessKeyId && secretAccessKey
      ? {
          credentials: {
            accessKeyId,
            secretAccessKey,
            ...(sessionToken ? { sessionToken } : {}),
          },
        }
      : {}),
  });
}

function requireS3Config(): S3StorageConfig {
  const config = getS3StorageConfig();

  if (!config) {
    throw new S3StorageUnavailableError(
      'Persistent S3 storage is not configured. Add AWS_REGION and S3_BUCKET_NAME to the Vercel project.',
    );
  }

  return config;
}

function normalizeEtag(etag: string | undefined): string {
  return (etag ?? '').replace(/^W\//, '').replace(/^"|"$/g, '');
}

export function isS3NotFoundError(error: unknown): boolean {
  return (
    (error instanceof Error &&
      ['NoSuchKey', 'NotFound', 'NoSuchBucket'].includes(error.name)) ||
    (typeof error === 'object' &&
      error !== null &&
      '$metadata' in error &&
      (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404)
  );
}

export function isS3PreconditionFailure(error: unknown): boolean {
  return (
    (error instanceof Error &&
      ['PreconditionFailed', 'ConditionalRequestConflict'].includes(error.name)) ||
    (typeof error === 'object' &&
      error !== null &&
      '$metadata' in error &&
      (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 412)
  );
}

export async function readS3Content(pathname = CURRENT_CONTENT_PATHNAME): Promise<{
  payload: string;
  etag: string;
} | null> {
  const config = requireS3Config();

  try {
    const result = await getS3Client(config).send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: pathname,
      }),
    );

    if (!result.Body) {
      return null;
    }

    return {
      payload: await result.Body.transformToString(),
      etag: normalizeEtag(result.ETag),
    };
  } catch (error) {
    if (isS3NotFoundError(error)) {
      return null;
    }

    throw error;
  }
}

export async function writeS3Content(
  pathname: string,
  payload: string,
  etag?: string,
): Promise<void> {
  const config = requireS3Config();

  await getS3Client(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: pathname,
      Body: payload,
      ContentType: 'application/json; charset=utf-8',
      ...(etag ? { IfMatch: etag } : {}),
    }),
  );
}

export function getPublicAssetUrl(key: string): string {
  const config = requireS3Config();
  return `${config.publicBaseUrl}/${key.replace(/^\/+/, '')}`;
}

export async function createUploadRequest(
  input: S3UploadRequestInput,
): Promise<{ uploadUrl: string; url: string; key: string }> {
  const config = requireS3Config();

  if (!ALLOWED_IMAGE_TYPES.has(input.contentType)) {
    throw new S3UploadValidationError(
      'Only JPEG, PNG, GIF, WebP, and AVIF images can be uploaded.',
    );
  }

  if (!Number.isFinite(input.size) || input.size <= 0) {
    throw new S3UploadValidationError('The image size must be greater than zero.');
  }

  if (input.size > readMaxUploadBytes()) {
    throw new S3UploadValidationError(
      `Images must be ${Math.round(readMaxUploadBytes() / (1024 * 1024))} MB or smaller.`,
    );
  }

  const safeFolder = sanitizeSegment(input.folder || 'projects');
  const safeFilename = sanitizeFilename(input.filename || 'upload.bin');
  const key = `assets/${safeFolder}/${Date.now()}-${safeFilename}`;
  const uploadUrl = await getSignedUrl(
    getS3Client(config),
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: input.contentType,
    }),
    { expiresIn: 600 },
  );

  return {
    uploadUrl,
    url: getPublicAssetUrl(key),
    key,
  };
}
