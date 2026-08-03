# Lucrative Design S3 Storage Migration Design

## Goal

Move Lucrative Design's persistent admin content and future uploaded images from Vercel Blob to a dedicated AWS S3 bucket, while preserving existing project content and removing the app's 4 MB upload ceiling.

## Current findings

- The production Vercel Blob store contains the authoritative content JSON but no uploaded image objects.
- The site's current 19 images are bundled under `public/projects` in the repository.
- The authenticated AWS account has no existing bucket containing Lucrative Design assets, so the migration will create a dedicated bucket in `ap-south-1`.
- Existing unrelated buckets will not be reused.

## Architecture

- Create a dedicated public-asset bucket named `lucrative-design-assets-176387411089` in `ap-south-1` (bucket names are globally unique). Public `GET` access is limited to objects under `assets/`; writes and content reads require the app's least-privilege IAM credentials.
- Store authoritative site content at `content/site-content-authoritative.json` in S3. The server reads and writes it through the AWS SDK and uses the object's ETag for optimistic concurrency.
- Store uploaded images at `assets/<folder>/<timestamp>-<sanitized-filename>` and return their S3 public URL.
- Replace multipart upload through the Vercel function with a two-step flow: the authenticated admin requests a presigned S3 `PUT` URL, then the browser uploads the file directly to S3. This avoids Vercel function request-body limits.
- Keep local development fallback behavior using `data/site-content.local.json` and `public/uploads/admin` when S3 configuration is absent outside Vercel.
- Upload the existing bundled images into S3 and update default content references to their S3 URLs only after the new bucket is verified. The original repository assets remain in place until the migration is proven.

## Configuration

Vercel will receive these environment variables in Development, Preview, and Production:

- `AWS_REGION=ap-south-1`
- `S3_BUCKET_NAME=lucrative-design-assets-176387411089`
- `S3_PUBLIC_BASE_URL=https://lucrative-design-assets-176387411089.s3.ap-south-1.amazonaws.com`
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` for a dedicated least-privilege IAM principal; root credentials will not be stored in Vercel.

## Error handling and safety

- Missing S3 configuration returns an explicit unavailable-storage state on Vercel rather than writing to the ephemeral filesystem.
- S3 `NoSuchKey` is treated as a missing content snapshot; other S3 errors are surfaced as storage-read failures.
- Presign requests validate the authenticated session, image MIME type, sanitized filename, and a configurable large-file safety limit. There is no hard-coded 4 MB limit.
- The migration will not delete the existing Blob object or repository assets until browser verification proves the S3-backed site works.

## Testing

- Unit tests cover S3 content read/write, ETag conflict handling, public URL construction, presign validation, local fallback, and removal of the Blob dependency.
- Build and full test suite must pass.
- Browser verification must cover admin login, project create/edit/delete, a real image upload larger than 4 MB, public image rendering, reload persistence, and two consecutive clean reads.
