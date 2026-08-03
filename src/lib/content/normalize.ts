import {
  cloneSiteContent,
  createFounderProfile,
  createHighlightCard,
  createImageAsset,
  createProject,
  createSiteSettings,
  createTeamSection,
  defaultSiteContent,
} from './defaultContent.js';
import type {
  FounderProfile,
  HighlightCard,
  ImageAsset,
  Project,
  SiteContent,
  SiteSettings,
  TeamSection,
} from './types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asStringList(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value
    .map((entry) => asString(entry))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeImageAsset(
  value: unknown,
  fallback?: Partial<ImageAsset>,
): ImageAsset {
  if (typeof value === 'string') {
    return createImageAsset({
      ...fallback,
      url: value,
      alt: fallback?.alt ?? '',
      caption: fallback?.caption ?? '',
    });
  }

  if (!isRecord(value)) {
    return createImageAsset(fallback);
  }

  return createImageAsset({
    ...fallback,
    id: asString(value.id, fallback?.id),
    url: asString(value.url ?? value.heroImg, fallback?.url),
    alt: asString(value.alt, fallback?.alt),
    caption: asString(value.caption, fallback?.caption),
  });
}

function normalizeHighlightCard(
  value: unknown,
  fallback?: HighlightCard,
): HighlightCard {
  if (!isRecord(value)) {
    return createHighlightCard(fallback);
  }

  return createHighlightCard({
    id: asString(value.id, fallback?.id),
    title: asString(value.title, fallback?.title),
    description: asString(value.description, fallback?.description),
  });
}

function normalizeFounderProfile(
  value: unknown,
  fallback?: FounderProfile,
): FounderProfile {
  const baseProfile = fallback ?? createFounderProfile();

  if (!isRecord(value)) {
    return createFounderProfile(baseProfile);
  }

  return createFounderProfile({
    name: asString(value.name, baseProfile.name),
    role: asString(value.role, baseProfile.role),
    description: asString(
      value.description ?? value.bio,
      baseProfile.description,
    ),
    imagePosition: value.imagePosition === 'right' ? 'right' : 'left',
    photo: normalizeImageAsset(
      value.photo ?? value.image,
      baseProfile.photo,
    ),
  });
}

function normalizeTeamSection(value: unknown): TeamSection {
  const baseSection = defaultSiteContent.team;

  if (!isRecord(value)) {
    return createTeamSection(baseSection);
  }

  return createTeamSection({
    eyebrow: asString(value.eyebrow, baseSection.eyebrow),
    title: asString(value.title, baseSection.title),
    founder: normalizeFounderProfile(
      value.founder ?? value.profile,
      baseSection.founder,
    ),
  });
}

function normalizeProject(value: unknown, fallback?: Project): Project {
  const baseProject = fallback ?? createProject();

  if (!isRecord(value)) {
    return createProject(baseProject);
  }

  const rawGallery = Array.isArray(value.gallery) ? value.gallery : null;
  const gallery = rawGallery
    ? rawGallery.map((entry, index) =>
        normalizeImageAsset(entry, baseProject.gallery[index]),
      )
    : baseProject.gallery.map((entry) => createImageAsset(entry));

  const heroImageSource =
    value.heroImage ??
    value.heroImg ??
    (gallery.length > 0 ? gallery[0] : baseProject.heroImage);

  const heroImage = normalizeImageAsset(heroImageSource, baseProject.heroImage);

  return createProject({
    id: asString(value.id, baseProject.id),
    slug: asString(value.slug, baseProject.slug),
    title: asString(value.title, baseProject.title),
    category: asString(value.category, baseProject.category),
    summary: asString(
      value.summary ?? value.description,
      baseProject.summary,
    ),
    services: asStringList(value.services, baseProject.services),
    heroImage,
    gallery,
  });
}

function normalizeSiteSettings(value: unknown): SiteSettings {
  const baseSettings = defaultSiteContent.settings;

  if (!isRecord(value)) {
    return createSiteSettings(baseSettings);
  }

  const highlightCardsInput = Array.isArray(value.highlightCards)
    ? value.highlightCards
    : baseSettings.highlightCards;

  return createSiteSettings({
    brandName: asString(value.brandName, baseSettings.brandName),
    brandLogoAlt: asString(value.brandLogoAlt, baseSettings.brandLogoAlt),
    logoMarkUrl: asString(value.logoMarkUrl, baseSettings.logoMarkUrl),
    logoFullUrl: asString(value.logoFullUrl, baseSettings.logoFullUrl),
    phoneDisplay: asString(value.phoneDisplay, baseSettings.phoneDisplay),
    phoneHref: asString(value.phoneHref, baseSettings.phoneHref),
    location: asString(value.location, baseSettings.location),
    heroEyebrow: asString(value.heroEyebrow, baseSettings.heroEyebrow),
    heroTitle: asString(value.heroTitle, baseSettings.heroTitle),
    heroSubtitle: asString(value.heroSubtitle, baseSettings.heroSubtitle),
    heroProjectSlug: asString(
      value.heroProjectSlug,
      baseSettings.heroProjectSlug,
    ),
    introEyebrow: asString(value.introEyebrow, baseSettings.introEyebrow),
    introTitle: asString(value.introTitle, baseSettings.introTitle),
    introParagraphs: asStringList(
      value.introParagraphs,
      baseSettings.introParagraphs,
    ),
    projectSectionTitle: asString(
      value.projectSectionTitle,
      baseSettings.projectSectionTitle,
    ),
    highlightEyebrow: asString(
      value.highlightEyebrow,
      baseSettings.highlightEyebrow,
    ),
    highlightValue: asString(value.highlightValue, baseSettings.highlightValue),
    highlightTitle: asString(value.highlightTitle, baseSettings.highlightTitle),
    highlightCards: highlightCardsInput.map((entry, index) =>
      normalizeHighlightCard(entry, baseSettings.highlightCards[index]),
    ),
    practiceAreasTitle: asString(
      value.practiceAreasTitle,
      baseSettings.practiceAreasTitle,
    ),
    practiceAreas: asStringList(value.practiceAreas, baseSettings.practiceAreas),
    footerNote: asString(value.footerNote, baseSettings.footerNote),
    footerSummary: asString(value.footerSummary, baseSettings.footerSummary),
  });
}

export function normalizeSiteContent(value: unknown): SiteContent {
  const baseContent = cloneSiteContent(defaultSiteContent);

  if (!isRecord(value)) {
    return baseContent;
  }

  const hasProjectsField = Array.isArray(value.projects);
  const rawProjects = hasProjectsField ? (value.projects as unknown[]) : [];
  const projects = hasProjectsField
    ? rawProjects.map((entry, index) =>
        normalizeProject(entry, baseContent.projects[index]),
      )
    : baseContent.projects.map((project) => createProject(project));

  return {
    settings: normalizeSiteSettings(value.settings),
    team: normalizeTeamSection(value.team),
    projects,
    updatedAt: asString(value.updatedAt, baseContent.updatedAt),
  };
}
