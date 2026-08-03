import assert from 'node:assert/strict';
import { afterEach, before, beforeEach, test } from 'node:test';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { POST as login } from '../api/admin/login.ts';
import {
  GET as getAdminContent,
  PUT as putAdminContent,
} from '../api/admin/content.ts';
import { POST as uploadAdmin } from '../api/admin/upload.ts';
import {
  cloneSiteContent,
  defaultSiteContent,
} from '../src/lib/content/defaultContent.ts';

const TEST_PASSWORD = 'stress-test-password';
const TEST_SESSION_SECRET = 'stress-test-secret';
const localContentPath = path.join(
  process.cwd(),
  'data',
  'site-content.local.json',
);
const environmentKeys = [
  'ADMIN_PASSWORD',
  'ADMIN_SESSION_SECRET',
  'VERCEL',
  'VERCEL_ENV',
  'BLOB_READ_WRITE_TOKEN',
] as const;
const originalEnvironment = Object.fromEntries(
  environmentKeys.map((key) => [key, process.env[key]]),
);
let originalLocalContent: Buffer | null = null;

before(async () => {
  originalLocalContent = await readFile(localContentPath).catch(() => null);
});

beforeEach(() => {
  process.env.ADMIN_PASSWORD = TEST_PASSWORD;
  process.env.ADMIN_SESSION_SECRET = TEST_SESSION_SECRET;
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

afterEach(async () => {
  for (const key of environmentKeys) {
    const value = originalEnvironment[key];

    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  if (originalLocalContent) {
    await writeFile(localContentPath, originalLocalContent);
  } else {
    await unlink(localContentPath).catch(() => undefined);
  }
});

function requestWithCookie(
  cookie: string,
  init: RequestInit = {},
): Request {
  const headers = new Headers(init.headers);
  headers.set('cookie', cookie);

  return new Request('http://localhost/api/admin/content', {
    ...init,
    headers,
  });
}

async function loginAndGetCookie(): Promise<string> {
  const response = await login(
    new Request('http://localhost/api/admin/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ password: TEST_PASSWORD }),
    }),
  );

  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  assert.ok(cookie);
  return cookie.split(';', 1)[0] ?? cookie;
}

function putContent(cookie: string, content: unknown, revision?: string): Promise<Response> {
  const headers = new Headers({
    'content-type': 'application/json',
  });

  if (revision) {
    headers.set('if-match', revision);
  }

  return putAdminContent(
    requestWithCookie(cookie, {
      method: 'PUT',
      headers,
      body: JSON.stringify(content),
    }),
  );
}

test('rejects admin content reads without a valid session', async () => {
  const response = await getAdminContent(
    new Request('http://localhost/api/admin/content'),
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { message: 'Not authenticated.' });
});

test('logs in with a password and reads local development content', async () => {
  const cookie = await loginAndGetCookie();
  const response = await getAdminContent(requestWithCookie(cookie));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.storage.mode, 'local');
  assert.equal(payload.content.projects.length, defaultSiteContent.projects.length);
});

test('saves a valid complete content payload in local development', async () => {
  const cookie = await loginAndGetCookie();
  const currentResponse = await getAdminContent(requestWithCookie(cookie));
  const currentPayload = await currentResponse.json();
  const content = cloneSiteContent(defaultSiteContent);
  content.settings.footerNote = 'LOCAL_TEST_SENTINEL';

  const response = await putContent(
    cookie,
    content,
    currentPayload.content.updatedAt,
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.content.settings.footerNote, 'LOCAL_TEST_SENTINEL');
});

test('rejects a malformed content envelope before normalization', async () => {
  const cookie = await loginAndGetCookie();

  const malformedContent = cloneSiteContent(defaultSiteContent);
  (malformedContent.settings as unknown as Record<string, unknown>).footerNote = null;

  for (const payload of [
    { not: 'site content' },
    { settings: {}, team: {}, projects: [], updatedAt: '' },
    malformedContent,
  ]) {
    const response = await putContent(cookie, payload);

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      message: 'A valid site content payload is required.',
    });
  }
});

test('requires a revision precondition for content saves', async () => {
  const cookie = await loginAndGetCookie();
  const response = await putContent(cookie, cloneSiteContent(defaultSiteContent));

  assert.equal(response.status, 428);
  assert.deepEqual(await response.json(), {
    message:
      'A content revision is required to save. Reload the admin dashboard and try again.',
  });
});

test('preserves an intentionally empty project gallery through the API', async () => {
  const cookie = await loginAndGetCookie();
  const currentResponse = await getAdminContent(requestWithCookie(cookie));
  const currentPayload = await currentResponse.json();
  const content = cloneSiteContent(defaultSiteContent);
  content.projects[0].gallery = [];

  const saveResponse = await putContent(
    cookie,
    content,
    currentPayload.content.updatedAt,
  );
  const savePayload = await saveResponse.json();
  const readResponse = await getAdminContent(requestWithCookie(cookie));
  const readPayload = await readResponse.json();

  assert.equal(saveResponse.status, 200);
  assert.deepEqual(savePayload.content.projects[0].gallery, []);
  assert.deepEqual(readPayload.content.projects[0].gallery, []);
});

test('rejects malformed login password values with JSON 400 responses', async () => {
  for (const password of [1, {}, []]) {
    const response = await login(
      new Request('http://localhost/api/admin/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ password }),
      }),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      message: 'Password is required.',
    });
  }
});

test('reports unavailable persistent storage on Vercel', async () => {
  process.env.VERCEL = '1';
  process.env.VERCEL_ENV = 'production';
  const cookie = await loginAndGetCookie();
  const readResponse = await getAdminContent(requestWithCookie(cookie));
  assert.equal(readResponse.status, 503);
  assert.deepEqual(await readResponse.json(), {
    message:
      'Persistent content storage is not configured. Add BLOB_READ_WRITE_TOKEN to the Vercel project.',
  });

  const saveResponse = await putContent(
    cookie,
    cloneSiteContent(defaultSiteContent),
    defaultSiteContent.updatedAt,
  );

  assert.equal(saveResponse.status, 503);
  assert.deepEqual(await saveResponse.json(), {
    message:
      'Persistent content storage is not configured. Add BLOB_READ_WRITE_TOKEN to the Vercel project.',
  });
});

test('reports unavailable upload storage on Vercel', async () => {
  process.env.VERCEL = '1';
  process.env.VERCEL_ENV = 'production';
  const cookie = await loginAndGetCookie();
  const formData = new FormData();
  formData.set(
    'file',
    new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], 'test.jpg', {
      type: 'image/jpeg',
    }),
  );

  const response = await uploadAdmin(
    new Request('http://localhost/api/admin/upload', {
      method: 'POST',
      headers: {
        cookie,
      },
      body: formData,
    }),
  );

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    message:
      'Persistent asset storage is not configured. Add BLOB_READ_WRITE_TOKEN to the Vercel project.',
  });
});

test('rejects unsupported and oversized uploads before storage', async () => {
  const cookie = await loginAndGetCookie();
  const unsupportedFormData = new FormData();
  unsupportedFormData.set(
    'file',
    new File(['html'], 'test.html', { type: 'text/html' }),
  );
  const unsupportedResponse = await uploadAdmin(
    new Request('http://localhost/api/admin/upload', {
      method: 'POST',
      headers: { cookie },
      body: unsupportedFormData,
    }),
  );
  assert.equal(unsupportedResponse.status, 415);

  const oversizedFormData = new FormData();
  oversizedFormData.set(
    'file',
    new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'large.jpg', {
      type: 'image/jpeg',
    }),
  );
  const oversizedResponse = await uploadAdmin(
    new Request('http://localhost/api/admin/upload', {
      method: 'POST',
      headers: { cookie },
      body: oversizedFormData,
    }),
  );
  assert.equal(oversizedResponse.status, 413);

  const spoofedFormData = new FormData();
  spoofedFormData.set(
    'file',
    new File(['not a jpeg'], 'spoofed.jpg', { type: 'image/jpeg' }),
  );
  const spoofedResponse = await uploadAdmin(
    new Request('http://localhost/api/admin/upload', {
      method: 'POST',
      headers: { cookie },
      body: spoofedFormData,
    }),
  );
  assert.equal(spoofedResponse.status, 415);
});

test('rejects a stale revision instead of silently overwriting newer content', async () => {
  const cookie = await loginAndGetCookie();
  const firstRead = await getAdminContent(requestWithCookie(cookie));
  const firstPayload = await firstRead.json();
  const baseRevision = firstPayload.content.updatedAt;

  const firstContent = cloneSiteContent(defaultSiteContent);
  firstContent.settings.footerNote = 'FIRST_EDITOR';
  const firstSave = await putContent(cookie, firstContent, baseRevision);
  assert.equal(firstSave.status, 200);

  const secondContent = cloneSiteContent(defaultSiteContent);
  secondContent.settings.footerNote = 'SECOND_EDITOR';
  const staleSave = await putContent(cookie, secondContent, baseRevision);

  assert.equal(staleSave.status, 409);
  assert.deepEqual(await staleSave.json(), {
    message:
      'Content changed since you opened the admin dashboard. Reload before saving again.',
  });
});

test('keeps local storage available for the Vercel development environment', async () => {
  process.env.VERCEL = '1';
  process.env.VERCEL_ENV = 'development';

  const cookie = await loginAndGetCookie();
  const response = await getAdminContent(requestWithCookie(cookie));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.storage.mode, 'local');
});
