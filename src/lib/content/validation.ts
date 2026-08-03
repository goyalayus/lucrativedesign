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

export function isSiteContentPayload(value: unknown): value is SiteContent {
  if (!isRecord(value)) {
    return false;
  }

  const settings = value.settings;
  const team = value.team;
  const projects = value.projects;
  const founder = isRecord(team) ? team.founder : null;

  return (
    hasRequiredKeys(value, ['settings', 'team', 'projects', 'updatedAt']) &&
    isRecord(settings) &&
    isRecord(team) &&
    hasRequiredKeys(settings, settingsKeys) &&
    hasRequiredKeys(team, ['eyebrow', 'title', 'founder']) &&
    isRecord(founder) &&
    hasRequiredKeys(founder, founderKeys) &&
    isRecord(founder.photo) &&
    hasRequiredKeys(founder.photo, imageKeys) &&
    Array.isArray(projects) &&
    projects.every((project) => {
      if (!isRecord(project) || !hasRequiredKeys(project, projectKeys)) {
        return false;
      }

      const heroImage = project.heroImage;
      const gallery = project.gallery;

      return (
        isRecord(heroImage) &&
        hasRequiredKeys(heroImage, imageKeys) &&
        Array.isArray(gallery) &&
        gallery.every(
          (image) => isRecord(image) && hasRequiredKeys(image, imageKeys),
        )
      );
    })
  );
}
