# S3 Storage Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Vercel Blob with a dedicated AWS S3 bucket for Lucrative Design content and direct large-image uploads.

**Architecture:** The Vercel server runtime uses the AWS SDK to read/write a private authoritative JSON object in S3. Authenticated admins request presigned `PUT` URLs, and the browser uploads image bytes directly to public asset keys under `assets/`, removing the current Vercel function upload-body bottleneck.

**Tech Stack:** Vue 3, TypeScript, Vercel serverless functions, AWS SDK v3 S3 client and presigner, Node test runner via `tsx`, pnpm, AWS S3 in `ap-south-1`.

## Global Constraints

- Do not reuse unrelated AWS buckets.
- Do not store AWS root credentials in Vercel.
- Do not delete the current Vercel Blob object or repository image files until S3 browser verification passes.
- Production with missing S3 configuration must show an explicit unavailable-storage state and must not write to the deployed filesystem.
- Direct uploads must not use the existing 4 MB multipart function route.

---

### Task 1: Add S3 storage adapter tests

**Files:**
- Create: `tests/s3-content-store.test.ts`
- Create: `tests/s3-upload.test.ts`

**Interfaces:**
- Tests will exercise `getContentStorageInfo`, `readSiteContentWithSource`, `writeSiteContent`, `createUploadRequest`, and `getPublicAssetUrl` through mocked AWS SDK commands.

- [ ] **Step 1: Write failing content-storage tests**

Cover these cases:

```ts
const CONTENT_PATH = 'content/site-content-authoritative.json';

test('reports S3 storage when the required variables exist', async () => {
  process.env.S3_BUCKET_NAME = 'lucrative-design-assets-test';
  process.env.AWS_REGION = 'ap-south-1';
  assert.equal(getContentStorageInfo().mode, 's3');
});

test('reads authoritative JSON and returns its ETag revision', async () => {
  const result = await readSiteContentWithSource({ strict: true });
  assert.equal(result.source, 's3-current');
  assert.equal(result.storageRevision?.etag, 'etag-1');
});

test('writes with the previous ETag as an S3 conditional write', async () => {
  await writeSiteContent(content, { pathname: CONTENT_PATH, etag: 'etag-1' });
  assert.deepEqual(lastPutInput, { key: CONTENT_PATH, ifMatch: 'etag-1' });
});
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `node --experimental-test-module-mocks --import tsx --test tests/s3-content-store.test.ts`

Expected: FAIL because the S3 adapter and `s3` storage mode do not exist yet.

- [ ] **Step 3: Write failing upload-presign tests**

Cover valid JPEG/PNG/WebP requests, sanitized key generation under `assets/`, rejection of unsupported types, rejection of missing authentication, and acceptance of a file size greater than 4 MB but within the configured safety limit.

- [ ] **Step 4: Run the focused upload tests and verify they fail**

Run: `node --experimental-test-module-mocks --import tsx --test tests/s3-upload.test.ts`

Expected: FAIL because the presign route and S3 URL helper do not exist yet.

### Task 2: Implement the S3 adapter and presigned upload route

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `api/_lib/s3-storage.ts`
- Modify: `api/_lib/content-store.ts`
- Create: `api/admin/upload-url.ts`
- Remove: `api/admin/upload.ts`
- Modify: `.env.example`

**Interfaces:**
- `getContentStorageInfo(): ContentStorageInfo` reports `mode: 's3' | 'local' | 'unavailable'`.
- `readSiteContentWithSource(options?): Promise<SiteContentReadResult>` reads `content/site-content-authoritative.json` from S3 and returns an ETag revision.
- `writeSiteContent(value, storageRevision?): Promise<SiteContent>` writes JSON to S3 with `IfMatch` when a revision exists.
- `createUploadRequest(input): Promise<{ uploadUrl: string; url: string; key: string }>` returns a presigned `PUT` URL and the final public asset URL.
- `getPublicAssetUrl(key): string` builds the configured public URL without exposing credentials.

- [ ] **Step 1: Add AWS SDK dependencies**

Run: `pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`

Remove `@vercel/blob` from `package.json`, then run `pnpm install` to refresh `pnpm-lock.yaml`.

- [ ] **Step 2: Implement the minimal S3 client and configuration reader**

Create an S3 client using `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and optional `AWS_SESSION_TOKEN`; require `S3_BUCKET_NAME`; use `S3_PUBLIC_BASE_URL` for public asset URLs.

- [ ] **Step 3: Implement content JSON reads and conditional writes**

Use `GetObjectCommand` for the authoritative object, `PutObjectCommand` with JSON content type and `IfMatch` for revisions, and map `NoSuchKey` and `PreconditionFailed` to the existing typed storage errors.

- [ ] **Step 4: Implement presigned direct uploads**

Use `PutObjectCommand` plus `getSignedUrl`. Sanitize the folder and filename, write keys as `assets/<folder>/<timestamp>-<filename>`, validate allowed image MIME types, and allow files larger than 4 MB up to `S3_MAX_UPLOAD_BYTES` (default 100 MB).

- [ ] **Step 5: Implement the authenticated `POST /api/admin/upload-url` route**

Require the existing admin session, parse JSON `{ filename, contentType, size, folder }`, call `createUploadRequest`, and return JSON containing `uploadUrl`, `url`, and `key`.

- [ ] **Step 6: Run focused tests and verify they pass**

Run: `node --experimental-test-module-mocks --import tsx --test tests/s3-content-store.test.ts tests/s3-upload.test.ts`

Expected: all focused S3 tests pass.

### Task 3: Switch the admin UI to direct S3 uploads

**Files:**
- Modify: `src/views/AdminView.vue`
- Modify: `tests/admin-api.test.ts`

**Interfaces:**
- `uploadFile(file, folder, key)` requests a presigned URL, performs a browser `PUT` of the file to S3, and returns the final public URL.

- [ ] **Step 1: Add a failing UI-contract test**

Assert that the admin upload client targets `/api/admin/upload-url`, sends file metadata as JSON, and performs a direct `PUT` using the returned `uploadUrl` instead of constructing `FormData` for the Vercel function.

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm test -- tests/admin-upload-client.test.ts`

Expected: FAIL because the current client still posts multipart data to `/api/admin/upload`.

- [ ] **Step 3: Implement the two-step browser upload**

Request the presigned URL with credentials, `PUT` the file with its MIME type, and preserve the existing session-expired/error messaging and draft URL updates.

- [ ] **Step 4: Update storage copy and mode checks**

Rename the admin storage mode from `blob` to `s3`, show “AWS S3 storage,” and keep upload controls visible only when S3 is configured.

- [ ] **Step 5: Run UI and full tests**

Run: `pnpm test`

Expected: all tests pass with no Vercel Blob references in application code.

### Task 4: Provision S3 and IAM safely

**Files:**
- Create: `infra/s3/lucrative-design-assets-policy.json`
- Create: `infra/s3/lucrative-design-assets-bucket-policy.json`
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Create the dedicated bucket**

Run in `ap-south-1`:

```bash
aws s3api create-bucket \
  --bucket lucrative-design-assets-176387411089 \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1
```

- [ ] **Step 2: Configure object ownership and public asset reads**

Set BucketOwnerEnforced ownership, keep content JSON under a non-public prefix, and apply a bucket policy allowing `s3:GetObject` only for `arn:aws:s3:::lucrative-design-assets-176387411089/assets/*`.

- [ ] **Step 3: Create a least-privilege IAM principal**

Create a dedicated principal scoped to `s3:GetObject`, `s3:PutObject`, `s3:HeadObject`, and `s3:ListBucket` only for this bucket and the `content/` and `assets/` prefixes. Do not use root credentials in Vercel.

- [ ] **Step 4: Record configuration without secrets**

Update `.env.example` and README instructions; store actual credentials only in Vercel environment variables and local secret configuration.

### Task 5: Migrate assets and content

**Files:**
- Modify: `src/lib/content/defaultContent.ts`
- Modify: `README.md`
- Create: `scripts/migrate-lucrative-design-to-s3.mjs`

- [ ] **Step 1: Upload existing repository images to `assets/projects/...`**

Use `aws s3 sync public/projects s3://lucrative-design-assets-176387411089/assets/projects --exclude '*.DS_Store'` and verify object count and byte totals.

- [ ] **Step 2: Update the default content URLs**

Replace `/projects/...` image URLs with the S3 public base URL plus `assets/projects/...`, preserving IDs, alt text, and captions.

- [ ] **Step 3: Seed the authoritative S3 JSON**

Use the normalized current site content as `content/site-content-authoritative.json`, preserving any production admin edits discovered before the cutover. Do not delete the old Blob JSON until production verification passes.

- [ ] **Step 4: Verify S3 objects read back correctly**

Run `aws s3api head-object` for the authoritative JSON and a representative small and large image, then verify the public asset URLs return image content.

### Task 6: Deploy and browser-verify the migration

**Files:**
- No source changes expected unless verification finds a defect.

- [ ] **Step 1: Configure Vercel environment variables**

Set S3 variables in Development, Preview, and Production; remove `BLOB_READ_WRITE_TOKEN` only after the S3 deployment is live and verified.

- [ ] **Step 2: Build and run all tests**

Run: `pnpm test && pnpm build && git diff --check`

Expected: zero test failures, successful production build, and no whitespace errors.

- [ ] **Step 3: Deploy and verify admin storage mode in Chrome**

Open `/admin`, authenticate through the UI, and confirm the dashboard reports AWS S3 storage with no storage warning.

- [ ] **Step 4: Browser-test large image upload**

Use a real image larger than 4 MB through the admin file chooser, confirm the direct S3 upload completes, save the project, and verify the public page renders the S3 URL after reload.

- [ ] **Step 5: Create and leave the browser test project for owner inspection**

Create one clearly named project through the dashboard, save it, reload admin to confirm persistence, and verify its public page and uploaded S3 image. Leave the project intact for the owner to inspect; edit and delete are deferred to the owner's follow-up instruction. Keep the old Blob object until this checklist is green.

- [ ] **Step 6: Final verification and cleanup**

Confirm no application imports `@vercel/blob`, confirm production no longer depends on `BLOB_READ_WRITE_TOKEN`, and only then remove the old Blob environment variable.
