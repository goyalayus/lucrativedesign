import { jsonResponse } from './_lib/http.js';
import { readSiteContent } from './_lib/content-store.js';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  const content = await readSiteContent();
  return jsonResponse(content);
}
