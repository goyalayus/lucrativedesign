export interface ImageAsset {
  id: string;
  url: string;
  alt: string;
  caption: string;
}

export type ImagePosition = 'left' | 'right';

export interface Project {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  services: string[];
  heroImage: ImageAsset;
  gallery: ImageAsset[];
}

export interface HighlightCard {
  id: string;
  title: string;
  description: string;
}

export interface FounderProfile {
  name: string;
  role: string;
  description: string;
  imagePosition: ImagePosition;
  photo: ImageAsset;
}

export interface TeamSection {
  eyebrow: string;
  title: string;
  founder: FounderProfile;
}

export interface SiteSettings {
  brandName: string;
  brandLogoAlt: string;
  logoMarkUrl: string;
  logoFullUrl: string;
  phoneDisplay: string;
  phoneHref: string;
  location: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroProjectSlug: string;
  introEyebrow: string;
  introTitle: string;
  introParagraphs: string[];
  projectSectionTitle: string;
  highlightEyebrow: string;
  highlightValue: string;
  highlightTitle: string;
  highlightCards: HighlightCard[];
  practiceAreasTitle: string;
  practiceAreas: string[];
  footerNote: string;
  footerSummary: string;
}

export interface SiteContent {
  settings: SiteSettings;
  team: TeamSection;
  projects: Project[];
  updatedAt: string;
}
