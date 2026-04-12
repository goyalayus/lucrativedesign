import type {
  FounderProfile,
  HighlightCard,
  ImageAsset,
  Project,
  SiteContent,
  SiteSettings,
  TeamSection,
} from './types.js';

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createImageAsset(
  value: Partial<ImageAsset> = {},
): ImageAsset {
  return {
    id: value.id ?? makeId('img'),
    url: value.url ?? '',
    alt: value.alt ?? '',
    caption: value.caption ?? '',
  };
}

export function createHighlightCard(
  value: Partial<HighlightCard> = {},
): HighlightCard {
  return {
    id: value.id ?? makeId('card'),
    title: value.title ?? '',
    description: value.description ?? '',
  };
}

export function createFounderProfile(
  value: Partial<FounderProfile> = {},
): FounderProfile {
  return {
    name: value.name ?? '',
    role: value.role ?? '',
    description: value.description ?? '',
    imagePosition: value.imagePosition === 'right' ? 'right' : 'left',
    photo: createImageAsset(value.photo),
  };
}

export function createTeamSection(
  value: Partial<TeamSection> = {},
): TeamSection {
  return {
    eyebrow: value.eyebrow ?? '',
    title: value.title ?? '',
    founder: createFounderProfile(value.founder),
  };
}

export function createProject(value: Partial<Project> = {}): Project {
  const heroImage = createImageAsset(value.heroImage);
  const gallery = (value.gallery ?? []).map((image) => createImageAsset(image));

  return {
    id: value.id ?? makeId('project'),
    slug: value.slug ?? '',
    title: value.title ?? '',
    category: value.category ?? '',
    summary: value.summary ?? '',
    services: value.services ?? [],
    heroImage,
    gallery,
  };
}

export function createSiteSettings(
  value: Partial<SiteSettings> = {},
): SiteSettings {
  return {
    brandName: value.brandName ?? '',
    brandLogoAlt: value.brandLogoAlt ?? '',
    logoMarkUrl: value.logoMarkUrl ?? '',
    logoFullUrl: value.logoFullUrl ?? '',
    phoneDisplay: value.phoneDisplay ?? '',
    phoneHref: value.phoneHref ?? '',
    location: value.location ?? '',
    heroEyebrow: value.heroEyebrow ?? '',
    heroTitle: value.heroTitle ?? '',
    heroSubtitle: value.heroSubtitle ?? '',
    heroProjectSlug: value.heroProjectSlug ?? '',
    introEyebrow: value.introEyebrow ?? '',
    introTitle: value.introTitle ?? '',
    introParagraphs: value.introParagraphs ?? [],
    projectSectionTitle: value.projectSectionTitle ?? '',
    highlightEyebrow: value.highlightEyebrow ?? '',
    highlightValue: value.highlightValue ?? '',
    highlightTitle: value.highlightTitle ?? '',
    highlightCards: (value.highlightCards ?? []).map((card) =>
      createHighlightCard(card),
    ),
    practiceAreasTitle: value.practiceAreasTitle ?? '',
    practiceAreas: value.practiceAreas ?? [],
    footerNote: value.footerNote ?? '',
    footerSummary: value.footerSummary ?? '',
  };
}

export const defaultSiteContent: SiteContent = {
  settings: createSiteSettings({
    brandName: 'Lucrative Design',
    brandLogoAlt: 'Lucrative Designs',
    logoMarkUrl: '/brand/logo-mark.jpg',
    logoFullUrl: '/brand/logo-full.jpg',
    phoneDisplay: '+91 99789 23855',
    phoneHref: 'tel:+919978923855',
    location: 'Gandhinagar, Gujarat',
    heroEyebrow: 'Gandhinagar, Gujarat',
    heroTitle: 'Lucrative Design',
    heroSubtitle:
      'Architecture, interiors, and planning shaped around practical use.',
    heroProjectSlug: 'residential-2',
    introEyebrow: 'About the practice',
    introTitle:
      'Lucrative Design is a Gandhinagar-based architectural and planning firm dedicated to creating functional, sustainable, and context-responsive spaces.',
    introParagraphs: [
      'With a strong foundation in architecture and urban planning, we deliver thoughtful design solutions that balance aesthetics, efficiency, and practicality.',
      'Our approach focuses on understanding client needs and transforming ideas into well-crafted built environments. At Lucrative Design, we aim to create spaces that are innovative, meaningful, and built to last.',
    ],
    projectSectionTitle: 'Featured Projects',
    highlightEyebrow: 'Portfolio snapshot',
    highlightValue: '57+',
    highlightTitle:
      'Projects including residential, commercial, and corporate work.',
    highlightCards: [
      createHighlightCard({
        id: 'highlight-residential',
        title: 'Residential',
        description:
          'Exterior concepts, home interiors, and compact housing studies.',
      }),
      createHighlightCard({
        id: 'highlight-commercial',
        title: 'Commercial',
        description:
          'Cafe and clinic spaces shaped around clear circulation and daily use.',
      }),
      createHighlightCard({
        id: 'highlight-corporate',
        title: 'Corporate',
        description:
          'Planning-led thinking that keeps functionality and presentation in balance.',
      }),
    ],
    practiceAreasTitle: 'Practice areas',
    practiceAreas: [
      'Architecture',
      'Planning',
      'Residential',
      'Commercial',
      'Corporate',
      'Interior Design',
      'Site Execution',
      'Art',
    ],
    footerNote: 'Architecture | Interior | Art',
    footerSummary:
      'Selected work from the current studio portfolio.',
  }),
  team: createTeamSection({
    eyebrow: '',
    title: '',
    founder: createFounderProfile({
      name: '',
      role: '',
      description: '',
      imagePosition: 'left',
      photo: createImageAsset(),
    }),
  }),
  projects: [
    createProject({
      id: 'project-residential-1',
      slug: 'residential-1',
      title: 'Residential 1',
      category: 'Residential Design',
      summary: 'Residential exterior concept study.',
      services: ['Architecture', 'Residential Design'],
      heroImage: createImageAsset({
        id: 'project-residential-1-hero',
        url: '/projects/residential-1/01.jpeg',
        alt: 'Residential 1 exterior view',
        caption: 'Front exterior concept.',
      }),
      gallery: [
        createImageAsset({
          id: 'project-residential-1-gallery-1',
          url: '/projects/residential-1/01.jpeg',
          alt: 'Residential 1 exterior view',
          caption: 'Front exterior concept.',
        }),
        createImageAsset({
          id: 'project-residential-1-gallery-2',
          url: '/projects/residential-1/02.jpeg',
          alt: 'Residential 1 angled exterior view',
          caption: 'Alternate exterior angle.',
        }),
      ],
    }),
    createProject({
      id: 'project-residential-2',
      slug: 'residential-2',
      title: 'Residential 2',
      category: 'Residential Design',
      summary: 'Residential exterior concept with a warmer material palette.',
      services: ['Architecture', 'Residential Design'],
      heroImage: createImageAsset({
        id: 'project-residential-2-hero',
        url: '/projects/residential-2/01.jpeg',
        alt: 'Residential 2 front facade',
        caption: 'Front facade concept.',
      }),
      gallery: [
        createImageAsset({
          id: 'project-residential-2-gallery-1',
          url: '/projects/residential-2/01.jpeg',
          alt: 'Residential 2 front facade',
          caption: 'Front facade concept.',
        }),
        createImageAsset({
          id: 'project-residential-2-gallery-2',
          url: '/projects/residential-2/02.jpeg',
          alt: 'Residential 2 second exterior angle',
          caption: 'Alternate exterior angle.',
        }),
      ],
    }),
    createProject({
      id: 'project-cafe-design',
      slug: 'cafe-design',
      title: 'Cafe Design',
      category: 'Commercial Interior',
      summary:
        'Cafe interior concept shaped around compact seating and wall graphics.',
      services: ['Interior Design', 'Commercial Design'],
      heroImage: createImageAsset({
        id: 'project-cafe-design-hero',
        url: '/projects/cafe-design/02.jpeg',
        alt: 'Cafe seating view',
        caption: 'Main seating zone.',
      }),
      gallery: [
        createImageAsset({
          id: 'project-cafe-design-gallery-1',
          url: '/projects/cafe-design/01.jpeg',
          alt: 'Cafe entrance side view',
          caption: 'Long view through the seating area.',
        }),
        createImageAsset({
          id: 'project-cafe-design-gallery-2',
          url: '/projects/cafe-design/02.jpeg',
          alt: 'Cafe seating and wall artwork',
          caption: 'Wall graphics and seating layout.',
        }),
        createImageAsset({
          id: 'project-cafe-design-gallery-3',
          url: '/projects/cafe-design/03.jpeg',
          alt: 'Cafe side wall and tables',
          caption: 'Alternate angle with side tables.',
        }),
      ],
    }),
    createProject({
      id: 'project-residential-interior-design',
      slug: 'residential-interior-design',
      title: 'Residential Interior Design',
      category: 'Residential Interior',
      summary:
        'Residential interior concept with integrated living, dining, and kitchen zones.',
      services: ['Interior Design', 'Residential Design', 'Site Execution'],
      heroImage: createImageAsset({
        id: 'project-residential-interior-design-hero',
        url: '/projects/residential-interior-design/06.jpeg',
        alt: 'Residential interior dining and lounge view',
        caption: 'Dining and lounge view.',
      }),
      gallery: [
        createImageAsset({
          id: 'project-residential-interior-design-gallery-1',
          url: '/projects/residential-interior-design/01.jpeg',
          alt: 'Residential interior living room',
          caption: 'Living room and kitchen overview.',
        }),
        createImageAsset({
          id: 'project-residential-interior-design-gallery-2',
          url: '/projects/residential-interior-design/02.jpeg',
          alt: 'Residential interior wall feature',
          caption: 'Wall treatment and lighting detail.',
        }),
        createImageAsset({
          id: 'project-residential-interior-design-gallery-3',
          url: '/projects/residential-interior-design/03.jpeg',
          alt: 'Residential interior seating area',
          caption: 'Seating view from the side.',
        }),
        createImageAsset({
          id: 'project-residential-interior-design-gallery-4',
          url: '/projects/residential-interior-design/04.jpeg',
          alt: 'Residential interior kitchen',
          caption: 'Kitchen and TV unit angle.',
        }),
        createImageAsset({
          id: 'project-residential-interior-design-gallery-5',
          url: '/projects/residential-interior-design/05.jpeg',
          alt: 'Residential interior dining area',
          caption: 'Dining table and lounge view.',
        }),
        createImageAsset({
          id: 'project-residential-interior-design-gallery-6',
          url: '/projects/residential-interior-design/06.jpeg',
          alt: 'Residential interior alternate dining view',
          caption: 'Alternate view across dining and lounge.',
        }),
      ],
    }),
    createProject({
      id: 'project-dentist-clinic-design',
      slug: 'dentist-clinic-design',
      title: 'Dentist Clinic Design',
      category: 'Clinic Interior',
      summary:
        'Dental clinic interior concept with soft lighting and focused treatment layouts.',
      services: ['Interior Design', 'Clinic Design', 'Commercial Design'],
      heroImage: createImageAsset({
        id: 'project-dentist-clinic-design-hero',
        url: '/projects/dentist-clinic-design/04.jpeg',
        alt: 'Dentist clinic treatment room',
        caption: 'Treatment room view.',
      }),
      gallery: [
        createImageAsset({
          id: 'project-dentist-clinic-design-gallery-1',
          url: '/projects/dentist-clinic-design/01.jpeg',
          alt: 'Dentist clinic wall design',
          caption: 'Feature wall detail.',
        }),
        createImageAsset({
          id: 'project-dentist-clinic-design-gallery-2',
          url: '/projects/dentist-clinic-design/02.jpeg',
          alt: 'Dentist clinic reception desk',
          caption: 'Reception and display area.',
        }),
        createImageAsset({
          id: 'project-dentist-clinic-design-gallery-3',
          url: '/projects/dentist-clinic-design/03.jpeg',
          alt: 'Dentist clinic shelving and interior',
          caption: 'Storage and consultation view.',
        }),
        createImageAsset({
          id: 'project-dentist-clinic-design-gallery-4',
          url: '/projects/dentist-clinic-design/04.jpeg',
          alt: 'Dentist clinic equipment sketch',
          caption: 'Treatment zone concept.',
        }),
        createImageAsset({
          id: 'project-dentist-clinic-design-gallery-5',
          url: '/projects/dentist-clinic-design/05.jpeg',
          alt: 'Dentist clinic workstation',
          caption: 'Chair and equipment layout.',
        }),
      ],
    }),
    createProject({
      id: 'project-masjid-design',
      slug: 'masjid-design',
      title: 'Masjid Design',
      category: 'Planning Concept',
      summary:
        'Masjid planning study with prayer space, circulation, and support areas.',
      services: ['Architecture', 'Planning'],
      heroImage: createImageAsset({
        id: 'project-masjid-design-hero',
        url: '/projects/masjid-design/01.jpeg',
        alt: 'Masjid planning layout',
        caption: 'Site and plan layout.',
      }),
      gallery: [
        createImageAsset({
          id: 'project-masjid-design-gallery-1',
          url: '/projects/masjid-design/01.jpeg',
          alt: 'Masjid planning layout',
          caption: 'Site and plan layout.',
        }),
      ],
    }),
  ],
  updatedAt: '2026-04-12T00:00:00.000Z',
};

export function cloneSiteContent(content: SiteContent): SiteContent {
  return JSON.parse(JSON.stringify(content)) as SiteContent;
}
