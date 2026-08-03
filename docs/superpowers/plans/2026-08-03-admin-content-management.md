# Admin Content Management Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Lucrative Design admin dashboard reliably save and upload content on Vercel, fail clearly when persistent storage is not connected, and prevent malformed requests from overwriting the site.

**Architecture:** Keep Vercel Blob as the production persistence layer and retain the existing local-file fallback only for non-Vercel development. Add an explicit storage-unavailable state, validate the admin payload envelope before normalization, and convert storage failures into stable JSON errors that the dashboard can display. Connect the existing empty `lucrative-design-assets` Blob store to the `lucrativedesign` Vercel project for all environments, then verify the deployed API and local regression suite twice.

**Tech Stack:** Vue 3, TypeScript, Vite, Vercel serverless functions, `@vercel/blob`, Node test runner via `tsx`, pnpm.

## Global Constraints

- Production and preview content must never write to the deployed filesystem; they require `BLOB_READ_WRITE_TOKEN`.
- Local-file persistence remains available only outside Vercel so `pnpm dev:vercel` can be used for local editing.
- The admin API must reject malformed top-level payloads with HTTP 400 instead of normalizing them into default content.
- Storage configuration failures must return JSON with a stable HTTP 503 response and an actionable message.
- Do not expose admin passwords, session secrets, Blob read/write tokens, or session-cookie values in logs, test output, commits, or the final response.
- Existing public content and the current admin content schema remain backward-compatible when a valid complete payload is supplied.
- A valid admin payload must include the complete top-level settings, team, project, image, and revision fields; partial envelopes must not be normalized into defaults.
- Empty project galleries are valid user edits and must remain empty after normalization and persistence.
- Login JSON with a non-string password must return HTTP 400, and uploads must reject non-image MIME types and files larger than 4 MB before storage.
- Admin saves include an `If-Match` revision and reject stale edits with HTTP 409.

---

### Task 1: Add failing admin API regression coverage

**Files:**
- Create: `tests/admin-api.test.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `POST` handlers from `api/admin/login.ts` and `api/admin/upload.ts`, `GET`/`PUT` handlers from `api/admin/content.ts`, and `defaultSiteContent` from `src/lib/content/defaultContent.ts`.
- Produces: reproducible tests for unauthenticated access, login cookies, valid local saves, malformed payload rejection, production storage-unavailable behavior, and upload behavior.

- [ ] **Step 1: Add the test runner dependency and test script**

Run:

```bash
pnpm add -D tsx
```

Add this script to `package.json`:

```json
"test": "tsx --test tests/admin-api.test.ts"
```

- [ ] **Step 2: Write tests that describe the required behavior**

The test file must set synthetic `ADMIN_PASSWORD=stress-test-password` and `ADMIN_SESSION_SECRET=stress-test-secret` only in process memory, restore environment variables after every test, and remove only the test-created `data/site-content.local.json` file in cleanup. Include these test cases:

```ts
test('rejects admin content reads without a valid session', async () => {
  const response = await getAdminContent(new Request('http://localhost/api/admin/content'));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { message: 'Not authenticated.' });
});

test('logs in with a password and reads local development content', async () => {
  const cookie = await loginAndGetCookie();
  const response = await getAdminContent(withCookie(cookie));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.storage.mode, 'local');
  assert.equal(payload.content.projects.length, defaultSiteContent.projects.length);
});

test('saves a valid complete content payload in local development', async () => {
  const cookie = await loginAndGetCookie();
  const content = cloneSiteContent(defaultSiteContent);
  content.settings.footerNote = 'LOCAL_TEST_SENTINEL';
  const response = await putAdminContent(withCookie(cookie), content);
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.content.settings.footerNote, 'LOCAL_TEST_SENTINEL');
});

test('rejects a malformed content envelope before normalization', async () => {
  const cookie = await loginAndGetCookie();
  const response = await putAdminContent(withCookie(cookie), { not: 'site content' });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    message: 'A valid site content payload is required.',
  });
});

test('reports unavailable persistent storage on Vercel', async () => {
  process.env.VERCEL = '1';
  process.env.VERCEL_ENV = 'production';
  const cookie = await loginAndGetCookie();
  const readResponse = await getAdminContent(withCookie(cookie));
  const readPayload = await readResponse.json();
  assert.equal(readPayload.storage.mode, 'unavailable');

  const content = cloneSiteContent(defaultSiteContent);
  const saveResponse = await putAdminContent(withCookie(cookie), content);
  assert.equal(saveResponse.status, 503);
  assert.deepEqual(await saveResponse.json(), {
    message: 'Persistent content storage is not configured. Add BLOB_READ_WRITE_TOKEN to the Vercel project.',
  });
});

test('reports unavailable upload storage on Vercel', async () => {
  process.env.VERCEL = '1';
  process.env.VERCEL_ENV = 'production';
  const cookie = await loginAndGetCookie();
  const formData = new FormData();
  formData.set('file', new File(['image'], 'test.jpg', { type: 'image/jpeg' }));
  const response = await uploadAdminFile(withCookie(cookie), formData);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    message: 'Persistent asset storage is not configured. Add BLOB_READ_WRITE_TOKEN to the Vercel project.',
  });
});
```

The helpers in the test file must call the real handlers and pass `Request`/`FormData` objects; do not mock the production handlers.

- [ ] **Step 3: Run the focused tests and confirm the expected red failures**

Run: `pnpm test`

Expected: the unauthenticated and current valid local behavior tests pass; the malformed envelope and Vercel storage tests fail because the current implementation accepts malformed objects and reports local fallback storage on Vercel.

### Task 2: Make storage capability and API failures explicit

**Files:**
- Modify: `api/_lib/content-store.ts`
- Modify: `api/admin/content.ts`
- Modify: `api/admin/upload.ts`

**Interfaces:**
- Consumes: the existing Blob versioned-content store and local development fallback.
- Produces: `ContentStorageMode = 'blob' | 'local' | 'unavailable'`, storage info that reports the unavailable state, typed storage errors, and JSON 503 responses.

- [ ] **Step 1: Add production storage detection and typed errors**

Implement `isVercelRuntime()` using `VERCEL` or `VERCEL_ENV`, and define typed errors with these exact messages:

```ts
const CONTENT_STORAGE_ERROR_MESSAGE =
  'Persistent content storage is not configured. Add BLOB_READ_WRITE_TOKEN to the Vercel project.';
const ASSET_STORAGE_ERROR_MESSAGE =
  'Persistent asset storage is not configured. Add BLOB_READ_WRITE_TOKEN to the Vercel project.';
```

When no Blob token exists, `getContentStorageInfo()` must return `{ mode: 'unavailable', label: 'Persistent storage not configured', detail: CONTENT_STORAGE_ERROR_MESSAGE }` on Vercel, and preserve `{ mode: 'local', ... }` outside Vercel.

- [ ] **Step 2: Guard production writes at the storage boundary**

Before local file writes in `writeSiteContent()` and `uploadAsset()`, throw the corresponding typed error when running on Vercel without a Blob token. Keep Blob writes unchanged when `BLOB_READ_WRITE_TOKEN` is present and keep local writes unchanged outside Vercel.

- [ ] **Step 3: Validate the storage tests are now green**

Run: `pnpm test`

Expected: the production content and upload tests pass, while the malformed payload test remains red until Task 3.

- [ ] **Step 4: Convert storage errors to stable JSON responses**

Wrap `readSiteContent()`/`writeSiteContent()` in `api/admin/content.ts` and `uploadAsset()` in `api/admin/upload.ts`. Return `errorResponse(error.message, 503)` for the typed storage errors and `errorResponse('Unable to read site content right now.', 503)` or `errorResponse('Unable to save site content right now.', 503)` for unexpected storage exceptions. Do not return stack traces or secret values.

### Task 3: Validate admin payloads and make the dashboard honor storage state

**Files:**
- Create: `src/lib/content/validation.ts`
- Modify: `api/admin/content.ts`
- Modify: `src/views/AdminView.vue`

**Interfaces:**
- Consumes: `SiteContent` shape from `src/lib/content/types.ts` and normalized content from `src/lib/content/normalize.ts`.
- Produces: `isSiteContentPayload(value: unknown): value is SiteContent`, API 400 validation, and an admin UI that disables saves/uploads when storage is unavailable.

- [ ] **Step 1: Add a narrow top-level payload validator**

Require a non-array object with own `settings`, `team`, and `projects` properties, where `settings` and `team` are non-null objects and `projects` is an array. Allow `projects: []` so an intentional empty project list remains valid. Use this validator before `normalizeSiteContent()`; never normalize malformed top-level input into defaults.

- [ ] **Step 2: Reject malformed `PUT /api/admin/content` requests**

Return exactly HTTP 400 and `{ message: 'A valid site content payload is required.' }` when the validator rejects the request. Normalize only after validation.

- [ ] **Step 3: Update the dashboard storage contract**

Extend the client storage mode union with `'unavailable'`, show the server-provided detail in the existing warning panel, set `canUpload` false for unavailable storage, and disable the Save button with a visible reason while storage is unavailable. Keep URL-based edits visible, but tell the user that changes cannot persist until Blob storage is connected.

- [ ] **Step 4: Run the focused tests and production build**

Run:

```bash
pnpm test
node_modules/.bin/vue-tsc -b
node_modules/.bin/vite build
```

Expected: all focused tests pass, TypeScript emits no errors, and Vite exits 0.

### Task 4: Connect the existing Blob store and verify deployment behavior

**Files:**
- Modify: Vercel project environment configuration for `lucrativedesign` only; no repository file changes required.

**Interfaces:**
- Consumes: existing Vercel Blob resource `lucrative-design-assets` (`store_YlxcMcHR3T0gMftJ`) and Vercel project `lucrativedesign` (`prj_988fvieHFr4Vv87DBscgcRnJe2wz`).
- Produces: `BLOB_READ_WRITE_TOKEN` available to Development, Preview, and Production without exposing its value.

- [ ] **Step 1: Connect the existing empty store to the current project**

Run:

```bash
npx vercel integration resource connect lucrative-design-assets lucrativedesign --environment production --environment preview --environment development --yes
```

Do not create a new store or connect the `lucrative-design-site-assets` store attached to `archipelago-clone`.

- [ ] **Step 2: Verify configuration without printing secrets**

Run `npx vercel env ls` and confirm `BLOB_READ_WRITE_TOKEN` is present in all three environments; redact values in any notes or output.

- [ ] **Step 3: Deploy the fix to a Vercel preview**

Commit the code on `fix/admin-content-management`, push it, and run `npx vercel deploy --yes` from the branch checkout. Verify the preview URL returns HTTP 200 for `/api/content`, HTTP 401 for unauthenticated `/api/admin/content`, and HTTP 200 for `/admin`.

### Task 5: Two consecutive verification passes and handoff

**Files:**
- Inspect: `git diff`, `git status`, test/build output, Vercel deployment output, and production environment-variable names.

- [ ] **Step 1: Run local verification pass one**

Run: `pnpm test && node_modules/.bin/vue-tsc -b && node_modules/.bin/vite build`

Record the full pass/fail counts and exit codes.

- [ ] **Step 2: Run local verification pass two from a clean process**

Run the exact same command again after stopping any dev server and confirming `git status --short` contains only intentional files. It must pass independently.

- [ ] **Step 3: Run deployed smoke checks twice**

For the preview deployment and then the production alias, verify `/api/content` is 200 JSON, `/admin` is 200 HTML, unauthenticated `/api/admin/content` is 401 JSON, and `npx vercel env ls` still shows `BLOB_READ_WRITE_TOKEN` in Production. Do not print cookies or credentials.

- [ ] **Step 4: Commit and report the exact remaining external dependency, if any**

Use `git diff --check`, `git status --short --branch`, and the final verification evidence before claiming completion. If Vercel resource connection or deployment cannot be completed, report that as the specific blocker instead of claiming the admin is fixed.
