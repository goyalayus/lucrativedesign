import type { SiteContent } from './types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function hasRequiredKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return keys.every((key) => hasOwn(value, key));
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

const settingsKeys = [
  'brandName',
  'brandLogoAlt',
  'logoMarkUrl',
  'logoFullUrl',
  'phoneDisplay',
  'phoneHref',
  'location',
  'heroEyebrow',
  'heroTitle',
  'heroSubtitle',
  'heroProjectSlug',
  'introEyebrow',
  'introTitle',
  'introParagraphs',
  'projectSectionTitle',
  'highlightEyebrow',
  'highlightValue',
  'highlightTitle',
  'highlightCards',
  'practiceAreasTitle',
  'practiceAreas',
  'footerNote',
  'footerSummary',
] as const;
const founderKeys = [
  'name',
  'role',
  'description',
  'imagePosition',
  'photo',
] as const;
const imageKeys = ['id', 'url', 'alt', 'caption'] as const;
const projectKeys = [
  'id',
  'slug',
  'title',
  'category',
  'summary',
  'services',
  'heroImage',
  'gallery',
] as const;

function isImageAssetPayload(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasRequiredKeys(value, imageKeys) &&
    isString(value.id) &&
    isString(value.url) &&
    isString(value.alt) &&
    isString(value.caption)
  );
}

function isHighlightCardPayload(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasRequiredKeys(value, ['id', 'title', 'description']) &&
    isString(value.id) &&
    isString(value.title) &&
    isString(value.description)
  );
}

function isSettingsPayload(value: unknown): boolean {
  if (!isRecord(value) || !hasRequiredKeys(value, settingsKeys)) {
    return false;
  }

  const stringKeys = settingsKeys.filter(
    (key) => key !== 'introParagraphs' &&
      key !== 'highlightCards' &&
      key !== 'practiceAreas',
  );

  return (
    stringKeys.every((key) => isString(value[key])) &&
    isStringList(value.introParagraphs) &&
    isStringList(value.practiceAreas) &&
    Array.isArray(value.highlightCards) &&
    value.highlightCards.every(isHighlightCardPayload)
  );
}

function isTeamPayload(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !hasRequiredKeys(value, ['eyebrow', 'title', 'founder']) ||
    !isString(value.eyebrow) ||
    !isString(value.title) ||
    !isRecord(value.founder) ||
    !hasRequiredKeys(value.founder, founderKeys)
  ) {
    return false;
  }

  return (
    isString(value.founder.name) &&
    isString(value.founder.role) &&
    isString(value.founder.description) &&
    (value.founder.imagePosition === 'left' ||
      value.founder.imagePosition === 'right') &&
    isImageAssetPayload(value.founder.photo)
  );
}

function isProjectPayload(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !hasRequiredKeys(value, projectKeys) ||
    !isString(value.id) ||
    !isString(value.slug) ||
    !isString(value.title) ||
    !isString(value.category) ||
    !isString(value.summary) ||
    !isStringList(value.services) ||
    !isImageAssetPayload(value.heroImage) ||
    !Array.isArray(value.gallery)
  ) {
    return false;
  }

  return value.gallery.every(isImageAssetPayload);
}

export function isSiteContentPayload(value: unknown): value is SiteContent {
  if (!isRecord(value)) {
    return false;
  }

  const projects = value.projects;

  return (
    hasRequiredKeys(value, ['settings', 'team', 'projects', 'updatedAt']) &&
    isString(value.updatedAt) &&
    isSettingsPayload(value.settings) &&
    isTeamPayload(value.team) &&
    Array.isArray(projects) &&
    projects.every(isProjectPayload)
  );
}
