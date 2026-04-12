import { jsonResponse } from './_lib/http.js';
import { readSiteContentWithSource } from './_lib/content-store.js';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  const { content } = await readSiteContentWithSource();
  return jsonResponse(content);
}
