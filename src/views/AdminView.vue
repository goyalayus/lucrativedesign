<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useSiteContent } from '../composables/useSiteContent';
import { AdminUploadError, uploadFileToS3 } from '../lib/admin-upload';
import {
  cloneSiteContent,
  createHighlightCard,
  createImageAsset,
  createProject,
} from '../lib/content/defaultContent';
import { normalizeSiteContent } from '../lib/content/normalize';
import type {
  FounderProfile,
  ImageAsset,
  Project,
  SiteContent,
} from '../lib/content/types';

type AdminMode = 'loading' | 'login' | 'ready';
type SettingImageField = 'logoMarkUrl' | 'logoFullUrl';
type AdminStorageMode = 's3' | 'local' | 'unavailable';

interface AdminStorageInfo {
  mode: AdminStorageMode;
  label: string;
  detail: string;
}

interface AdminContentResponse {
  content: SiteContent;
  storage?: AdminStorageInfo | null;
}

const mode = ref<AdminMode>('loading');
const draft = ref<SiteContent | null>(null);
const loginPassword = ref('');
const errorMessage = ref('');
const successMessage = ref('');
const isSaving = ref(false);
const uploading = ref<Record<string, boolean>>({});
const savedSnapshot = ref('');
const storageInfo = ref<AdminStorageInfo | null>(null);
const { replaceContent } = useSiteContent();

const canUpload = computed(() => storageInfo.value?.mode === 's3');
const canSave = computed(() => storageInfo.value?.mode !== 'unavailable');

const imageInputHelpText = computed(() =>
  canUpload.value
    ? 'Paste a public image URL or upload a file directly to AWS S3.'
    : 'Paste a public image URL here. Upload buttons stay hidden until S3 storage is connected.',
);

const galleryHelpText = computed(() =>
  canUpload.value
    ? 'Paste public image URLs, captions, or upload new files directly to S3.'
    : 'Paste public image URLs and captions for each gallery item.',
);

const isDirty = computed(() => {
  if (!draft.value) {
    return false;
  }

  return JSON.stringify(draft.value) !== savedSnapshot.value;
});

const updatedAtLabel = computed(() => {
  if (!draft.value?.updatedAt) {
    return 'Not saved yet';
  }

  return new Date(draft.value.updatedAt).toLocaleString();
});

const projectCountLabel = computed(() => {
  const totalProjects = draft.value?.projects.length ?? 0;
  return `${totalProjects} project${totalProjects === 1 ? '' : 's'}`;
});

onMounted(() => {
  void loadAdminContent();
});

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function scrollToElement(elementId: string): void {
  document.getElementById(elementId)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

function setUploading(key: string, value: boolean): void {
  uploading.value = {
    ...uploading.value,
    [key]: value,
  };
}

function getFileFromEvent(event: Event): File | null {
  const input = event.target as HTMLInputElement | null;
  const file = input?.files?.[0] ?? null;

  if (input) {
    input.value = '';
  }

  return file;
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `Request failed with status ${response.status}.`;

  try {
    const payload = await response.json() as { message?: string };
    return payload.message ?? fallback;
  } catch {
    return fallback;
  }
}

function syncHeroProjectSlug(): void {
  if (!draft.value) {
    return;
  }

  const availableSlugs = draft.value.projects
    .map((project) => project.slug.trim())
    .filter(Boolean);

  if (!availableSlugs.includes(draft.value.settings.heroProjectSlug)) {
    draft.value.settings.heroProjectSlug = availableSlugs[0] ?? '';
  }
}

function parseAdminContentResponse(payload: unknown): AdminContentResponse {
  if (
    payload &&
    typeof payload === 'object' &&
    'content' in payload &&
    payload.content
  ) {
    return payload as AdminContentResponse;
  }

  return {
    content: normalizeSiteContent(payload as SiteContent),
    storage: null,
  };
}

function hydrateDraft(content: SiteContent, nextStorageInfo: AdminStorageInfo | null = null): void {
  const nextContent = normalizeSiteContent(content);
  draft.value = cloneSiteContent(nextContent);
  savedSnapshot.value = JSON.stringify(nextContent);
  storageInfo.value = nextStorageInfo;
  replaceContent(nextContent);
  syncHeroProjectSlug();
}

async function loadAdminContent(): Promise<void> {
  mode.value = 'loading';
  successMessage.value = '';

  try {
    const response = await fetch('/api/admin/content', {
      cache: 'no-store',
      credentials: 'include',
      headers: {
        accept: 'application/json',
      },
    });

    if (response.status === 401) {
      mode.value = 'login';
      errorMessage.value = '';
      return;
    }

    if (!response.ok) {
      mode.value = 'login';
      errorMessage.value = await readErrorMessage(response);
      return;
    }

    const payload = parseAdminContentResponse(await response.json());
    hydrateDraft(payload.content, payload.storage ?? null);
    mode.value = 'ready';
    errorMessage.value = '';
  } catch {
    mode.value = 'login';
    errorMessage.value =
      "The admin API isn't available here. For local editing, run `pnpm dev:vercel` instead of plain `pnpm dev`.";
  }
}

async function login(): Promise<void> {
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        password: loginPassword.value,
      }),
    });

    if (!response.ok) {
      errorMessage.value = await readErrorMessage(response);
      return;
    }

    loginPassword.value = '';
    await loadAdminContent();
  } catch {
    errorMessage.value =
      'Login failed because the admin API could not be reached.';
  }
}

async function logout(): Promise<void> {
  await fetch('/api/admin/logout', {
    method: 'POST',
    credentials: 'include',
  }).catch(() => null);

  mode.value = 'login';
  successMessage.value = '';
  errorMessage.value = '';
}

function ensureProjectBasics(project: Project, index: number): void {
  if (!project.slug.trim()) {
    project.slug = slugify(project.title) || `project-${index + 1}`;
  }

  if (!project.heroImage.url && project.gallery[0]) {
    project.heroImage = createImageAsset(project.gallery[0]);
  }
}

async function saveContent(): Promise<void> {
  if (!draft.value) {
    return;
  }

  if (!canSave.value) {
    errorMessage.value =
      storageInfo.value?.detail ??
      'Persistent storage is not configured. Add AWS_REGION and S3_BUCKET_NAME to the Vercel project.';
    return;
  }

  successMessage.value = '';
  errorMessage.value = '';
  isSaving.value = true;

  try {
    draft.value.projects.forEach((project, index) => {
      ensureProjectBasics(project, index);
    });
    syncHeroProjectSlug();

    const headers = new Headers({
      'content-type': 'application/json',
    });

    if (draft.value.updatedAt) {
      headers.set('if-match', draft.value.updatedAt);
    }

    const response = await fetch('/api/admin/content', {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify(draft.value),
    });

    if (response.status === 401) {
      mode.value = 'login';
      errorMessage.value = 'Your session expired. Log in again and save once more.';
      return;
    }

    if (!response.ok) {
      errorMessage.value = await readErrorMessage(response);
      return;
    }

    const payload = parseAdminContentResponse(await response.json());
    hydrateDraft(payload.content, payload.storage ?? null);
    successMessage.value = 'Saved.';
  } catch {
    errorMessage.value = 'Save failed. Try again in a second.';
  } finally {
    isSaving.value = false;
  }
}

async function uploadFile(file: File, folder: string, key: string): Promise<string | null> {
  setUploading(key, true);
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const uploadedUrl = await uploadFileToS3(file, folder);
    successMessage.value = 'Image uploaded to S3.';
    return uploadedUrl;
  } catch (error) {
    if (error instanceof AdminUploadError && error.status === 401) {
      mode.value = 'login';
      errorMessage.value = 'Your session expired. Log in again and retry the upload.';
      return null;
    }

    errorMessage.value = error instanceof Error
      ? error.message
      : 'Upload failed. Try again in a second.';
    return null;
  } finally {
    setUploading(key, false);
  }
}

async function updateSettingImage(
  event: Event,
  field: SettingImageField,
): Promise<void> {
  if (!draft.value) {
    return;
  }

  const file = getFileFromEvent(event);

  if (!file) {
    return;
  }

  const folder = field === 'logoMarkUrl' ? 'brand-mark' : 'brand-full';
  const key = `settings-${field}`;
  const uploadedUrl = await uploadFile(file, folder, key);

  if (!uploadedUrl) {
    return;
  }

  draft.value.settings[field] = uploadedUrl;
}

async function updateHeroImage(event: Event, project: Project): Promise<void> {
  const file = getFileFromEvent(event);

  if (!file) {
    return;
  }

  const folder = project.slug || 'projects';
  const key = `hero-${project.id}`;
  const uploadedUrl = await uploadFile(file, folder, key);

  if (!uploadedUrl) {
    return;
  }

  project.heroImage.url = uploadedUrl;
  project.heroImage.alt ||= `${project.title} hero image`;
}

async function updateFounderPhoto(
  event: Event,
  founder: FounderProfile,
): Promise<void> {
  if (!draft.value) {
    return;
  }

  const file = getFileFromEvent(event);

  if (!file) {
    return;
  }

  const uploadedUrl = await uploadFile(file, 'founder', 'team-founder-photo');

  if (!uploadedUrl) {
    return;
  }

  founder.photo.url = uploadedUrl;
  founder.photo.alt ||= founder.name || `${draft.value.settings.brandName} founder photo`;
}

async function addGalleryUpload(event: Event, project: Project): Promise<void> {
  const file = getFileFromEvent(event);

  if (!file) {
    return;
  }

  const folder = project.slug || 'projects';
  const key = `gallery-add-${project.id}`;
  const uploadedUrl = await uploadFile(file, folder, key);

  if (!uploadedUrl) {
    return;
  }

  const image = createImageAsset({
    url: uploadedUrl,
    alt: `${project.title} image`,
    caption: '',
  });
  project.gallery.push(image);

  if (!project.heroImage.url) {
    project.heroImage = createImageAsset(image);
  }
}

async function replaceGalleryImage(
  event: Event,
  project: Project,
  image: ImageAsset,
): Promise<void> {
  const file = getFileFromEvent(event);

  if (!file) {
    return;
  }

  const folder = project.slug || 'projects';
  const key = `gallery-${image.id}`;
  const uploadedUrl = await uploadFile(file, folder, key);

  if (!uploadedUrl) {
    return;
  }

  image.url = uploadedUrl;
  image.alt ||= `${project.title} image`;
}

function addIntroParagraph(): void {
  draft.value?.settings.introParagraphs.push('');
}

function removeIntroParagraph(index: number): void {
  draft.value?.settings.introParagraphs.splice(index, 1);
}

function addHighlightCard(): void {
  draft.value?.settings.highlightCards.push(createHighlightCard());
}

function removeHighlightCard(index: number): void {
  draft.value?.settings.highlightCards.splice(index, 1);
}

function addPracticeArea(): void {
  draft.value?.settings.practiceAreas.push('');
}

function removePracticeArea(index: number): void {
  draft.value?.settings.practiceAreas.splice(index, 1);
}

async function addProject(): Promise<void> {
  if (!draft.value) {
    return;
  }

  const nextIndex = draft.value.projects.length + 1;
  const newProject = createProject({
    title: 'New Project',
    slug: `project-${nextIndex}`,
    category: 'New Category',
    summary: '',
    services: [''],
    heroImage: createImageAsset(),
    gallery: [],
  });

  draft.value.projects.unshift(newProject);
  syncHeroProjectSlug();
  await nextTick();
  scrollToElement(newProject.id);
}

function removeProject(index: number): void {
  if (!draft.value) {
    return;
  }

  draft.value.projects.splice(index, 1);
  syncHeroProjectSlug();
}

function moveProject(index: number, direction: -1 | 1): void {
  if (!draft.value) {
    return;
  }

  const nextIndex = index + direction;

  if (nextIndex < 0 || nextIndex >= draft.value.projects.length) {
    return;
  }

  const [project] = draft.value.projects.splice(index, 1);

  if (!project) {
    return;
  }

  draft.value.projects.splice(nextIndex, 0, project);
}

function refreshProjectSlug(project: Project): void {
  project.slug = slugify(project.title);
  syncHeroProjectSlug();
}

function addService(project: Project): void {
  project.services.push('');
}

function removeService(project: Project, index: number): void {
  project.services.splice(index, 1);
}

function addEmptyGalleryImage(project: Project): void {
  project.gallery.push(createImageAsset());
}

function useGalleryImageAsHero(project: Project, image: ImageAsset): void {
  project.heroImage = createImageAsset(image);
}

function removeGalleryImage(project: Project, index: number): void {
  const [removed] = project.gallery.splice(index, 1);

  if (!removed) {
    return;
  }

  if (project.heroImage.url === removed.url) {
    project.heroImage = project.gallery[0]
      ? createImageAsset(project.gallery[0])
      : createImageAsset();
  }
}

</script>

<template>
  <div class="min-h-screen bg-[#f6f3eb] px-4 pb-16 pt-10 text-[#162328] md:px-8">
    <div class="mx-auto max-w-7xl">
      <div v-if="mode === 'loading'" class="flex min-h-[50vh] items-center justify-center">
        <p class="text-lg text-[#162328]/65">Loading admin dashboard...</p>
      </div>

      <section
        v-else-if="mode === 'login'"
        class="mx-auto mt-20 max-w-md rounded-[32px] border border-black/5 bg-white p-8 shadow-sm"
      >
        <p class="text-sm uppercase tracking-[0.35em] text-[#3e8e60]">Lucrative Design</p>
        <h1 class="mt-4 text-4xl font-light">Admin login</h1>
        <p class="mt-4 text-base leading-relaxed text-[#162328]/65">
          This dashboard saves live content for the Vercel site. Use the admin password to get in.
        </p>

        <label class="mt-8 block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">
          Password
        </label>
        <input
          v-model="loginPassword"
          type="password"
          class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 text-base outline-none transition focus:border-[#3e8e60]"
          @keyup.enter="login"
        />

        <p v-if="errorMessage" class="mt-4 text-sm leading-relaxed text-[#b04a3a]">
          {{ errorMessage }}
        </p>

        <div class="mt-8 flex items-center justify-between gap-4">
          <button
            type="button"
            class="rounded-full bg-[#162328] px-6 py-3 text-sm font-medium uppercase tracking-[0.22em] text-white transition hover:bg-[#21343a]"
            @click="login"
          >
            Log in
          </button>
          <p class="text-sm text-[#162328]/50">Local editing: `pnpm dev:vercel`</p>
        </div>
      </section>

      <div v-else-if="draft" class="space-y-8">
        <header class="sticky top-4 z-30 rounded-[30px] border border-black/5 bg-white/95 p-5 shadow-sm backdrop-blur">
          <div class="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p class="text-sm uppercase tracking-[0.35em] text-[#3e8e60]">Admin dashboard</p>
              <h1 class="mt-2 text-3xl font-light">Edit site content</h1>
              <p class="mt-2 text-sm text-[#162328]/55">Last saved: {{ updatedAtLabel }}</p>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                class="rounded-full border border-black/10 px-5 py-3 text-sm font-medium uppercase tracking-[0.22em] transition hover:border-[#3e8e60] hover:text-[#3e8e60]"
              >
                View site
              </a>
              <button
                type="button"
                class="rounded-full border border-black/10 px-5 py-3 text-sm font-medium uppercase tracking-[0.22em] transition hover:border-[#3e8e60] hover:text-[#3e8e60]"
                @click="addProject"
              >
                Add new project
              </button>
              <button
                type="button"
                class="rounded-full border border-black/10 px-5 py-3 text-sm font-medium uppercase tracking-[0.22em] transition hover:border-[#b04a3a] hover:text-[#b04a3a]"
                @click="logout"
              >
                Log out
              </button>
              <button
                type="button"
                class="rounded-full bg-[#162328] px-6 py-3 text-sm font-medium uppercase tracking-[0.22em] text-white transition hover:bg-[#21343a] disabled:cursor-not-allowed disabled:opacity-55"
                :disabled="isSaving || !canSave"
                @click="saveContent"
              >
                {{ isSaving ? 'Saving...' : 'Save changes' }}
              </button>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <p :class="isDirty ? 'text-[#b04a3a]' : 'text-[#3e8e60]'">
              {{ isDirty ? 'Unsaved changes' : 'Everything saved' }}
            </p>
            <p class="text-[#162328]/55">
              {{ projectCountLabel }}
            </p>
            <p v-if="storageInfo" class="text-[#162328]/55">
              {{ storageInfo.label }}
            </p>
            <p v-if="successMessage" class="text-[#3e8e60]">{{ successMessage }}</p>
            <p v-if="errorMessage" class="text-[#b04a3a]">{{ errorMessage }}</p>
          </div>

          <div
            v-if="storageInfo && storageInfo.mode !== 's3'"
            class="mt-4 rounded-[24px] border border-[#ead5b6] bg-[#fff6ea] px-4 py-3 text-sm leading-relaxed text-[#6d5334]"
          >
            {{ storageInfo.detail }}
          </div>
        </header>

        <section class="rounded-[32px] border border-black/5 bg-white p-6 shadow-sm">
          <div class="mb-8 flex items-center justify-between gap-4">
            <div>
              <p class="text-sm uppercase tracking-[0.35em] text-[#3e8e60]">Global settings</p>
              <h2 class="mt-2 text-2xl font-light">Brand, hero, and homepage copy</h2>
            </div>
          </div>

          <div class="mb-8 rounded-[24px] border border-black/6 bg-[#f8f5ee] px-5 py-4 text-sm leading-relaxed text-[#162328]/68">
            {{ imageInputHelpText }}
          </div>

          <div class="grid gap-8 md:grid-cols-2">
            <div class="space-y-6">
              <div>
                <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Brand name</label>
                <input v-model="draft.settings.brandName" class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-[#3e8e60]" />
              </div>

              <div>
                <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Logo alt text</label>
                <input v-model="draft.settings.brandLogoAlt" class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-[#3e8e60]" />
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div>
                  <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Logo mark URL</label>
                  <input v-model="draft.settings.logoMarkUrl" placeholder="https://..." class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 text-sm outline-none transition focus:border-[#3e8e60]" />
                  <label v-if="canUpload" class="mt-3 inline-flex cursor-pointer rounded-full border border-black/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] transition hover:border-[#3e8e60] hover:text-[#3e8e60]">
                    {{ uploading['settings-logoMarkUrl'] ? 'Uploading...' : 'Upload logo mark' }}
                    <input type="file" accept="image/*" class="hidden" @change="updateSettingImage($event, 'logoMarkUrl')" />
                  </label>
                </div>

                <div>
                  <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Logo full URL</label>
                  <input v-model="draft.settings.logoFullUrl" placeholder="https://..." class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 text-sm outline-none transition focus:border-[#3e8e60]" />
                  <label v-if="canUpload" class="mt-3 inline-flex cursor-pointer rounded-full border border-black/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] transition hover:border-[#3e8e60] hover:text-[#3e8e60]">
                    {{ uploading['settings-logoFullUrl'] ? 'Uploading...' : 'Upload full logo' }}
                    <input type="file" accept="image/*" class="hidden" @change="updateSettingImage($event, 'logoFullUrl')" />
                  </label>
                </div>
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div>
                  <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Phone display</label>
                  <input v-model="draft.settings.phoneDisplay" class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-[#3e8e60]" />
                </div>

                <div>
                  <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Phone link</label>
                  <input v-model="draft.settings.phoneHref" class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-[#3e8e60]" />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Location</label>
                <input v-model="draft.settings.location" class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-[#3e8e60]" />
              </div>
            </div>

            <div class="space-y-6">
              <div>
                <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Hero eyebrow</label>
                <input v-model="draft.settings.heroEyebrow" class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-[#3e8e60]" />
              </div>

              <div>
                <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Hero title</label>
                <input v-model="draft.settings.heroTitle" class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-[#3e8e60]" />
              </div>

              <div>
                <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Hero subtitle</label>
                <textarea v-model="draft.settings.heroSubtitle" rows="3" class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-[#3e8e60]"></textarea>
              </div>

              <div>
                <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Hero project</label>
                <select v-model="draft.settings.heroProjectSlug" class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-[#3e8e60]">
                  <option v-for="project in draft.projects" :key="project.id" :value="project.slug">
                    {{ project.title || project.slug || 'Untitled project' }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Project section title</label>
                <input v-model="draft.settings.projectSectionTitle" class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-[#3e8e60]" />
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-[32px] border border-black/5 bg-white p-6 shadow-sm">
          <p class="text-sm uppercase tracking-[0.35em] text-[#3e8e60]">Homepage sections</p>
          <div class="mt-8 grid gap-8 lg:grid-cols-2">
            <div class="space-y-6">
              <div>
                <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Intro eyebrow</label>
                <input v-model="draft.settings.introEyebrow" class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-[#3e8e60]" />
              </div>

              <div>
                <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Intro title</label>
                <textarea v-model="draft.settings.introTitle" rows="4" class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-[#3e8e60]"></textarea>
              </div>

              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <label class="text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Intro paragraphs</label>
                  <button type="button" class="rounded-full border border-black/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] transition hover:border-[#3e8e60] hover:text-[#3e8e60]" @click="addIntroParagraph">
                    Add paragraph
                  </button>
                </div>

                <div v-for="(_, index) in draft.settings.introParagraphs" :key="`intro-${index}`" class="rounded-[24px] border border-black/6 bg-[#f8f5ee] p-4">
                  <div class="flex items-center justify-between">
                    <p class="text-sm uppercase tracking-[0.18em] text-[#162328]/45">Paragraph {{ index + 1 }}</p>
                    <button type="button" class="text-sm text-[#b04a3a]" @click="removeIntroParagraph(index)">
                      Remove
                    </button>
                  </div>
                  <textarea v-model="draft.settings.introParagraphs[index]" rows="3" class="mt-3 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#3e8e60]"></textarea>
                </div>
              </div>
            </div>

            <div class="space-y-6">
              <div>
                <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Highlight eyebrow</label>
                <input v-model="draft.settings.highlightEyebrow" class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-[#3e8e60]" />
              </div>

              <div class="grid gap-4 md:grid-cols-[0.35fr,0.65fr]">
                <div>
                  <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Highlight value</label>
                  <input v-model="draft.settings.highlightValue" class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-[#3e8e60]" />
                </div>

                <div>
                  <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Highlight title</label>
                  <input v-model="draft.settings.highlightTitle" class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-[#3e8e60]" />
                </div>
              </div>

              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <label class="text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Highlight cards</label>
                  <button type="button" class="rounded-full border border-black/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] transition hover:border-[#3e8e60] hover:text-[#3e8e60]" @click="addHighlightCard">
                    Add card
                  </button>
                </div>

                <div v-for="(card, index) in draft.settings.highlightCards" :key="card.id" class="rounded-[24px] border border-black/6 bg-[#f8f5ee] p-4">
                  <div class="flex items-center justify-between">
                    <p class="text-sm uppercase tracking-[0.18em] text-[#162328]/45">Card {{ index + 1 }}</p>
                    <button type="button" class="text-sm text-[#b04a3a]" @click="removeHighlightCard(index)">
                      Remove
                    </button>
                  </div>
                  <input v-model="card.title" placeholder="Title" class="mt-3 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#3e8e60]" />
                  <textarea v-model="card.description" rows="3" placeholder="Description" class="mt-3 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#3e8e60]"></textarea>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-[32px] border border-black/5 bg-white p-6 shadow-sm">
          <div class="grid gap-8 lg:grid-cols-2">
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm uppercase tracking-[0.35em] text-[#3e8e60]">Practice areas</p>
                  <h2 class="mt-2 text-2xl font-light">Scrolling labels</h2>
                </div>

                <button type="button" class="rounded-full border border-black/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] transition hover:border-[#3e8e60] hover:text-[#3e8e60]" @click="addPracticeArea">
                  Add area
                </button>
              </div>

              <div>
                <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Section title</label>
                <input v-model="draft.settings.practiceAreasTitle" class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-[#3e8e60]" />
              </div>

              <div v-for="(_, index) in draft.settings.practiceAreas" :key="`area-${index}`" class="flex items-center gap-3">
                <input v-model="draft.settings.practiceAreas[index]" class="w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-[#3e8e60]" />
                <button type="button" class="rounded-full border border-black/10 px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-[#b04a3a]" @click="removePracticeArea(index)">
                  Remove
                </button>
              </div>
            </div>

            <div class="space-y-6">
              <p class="text-sm uppercase tracking-[0.35em] text-[#3e8e60]">Footer</p>

              <div>
                <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Footer note</label>
                <input v-model="draft.settings.footerNote" class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-[#3e8e60]" />
              </div>

              <div>
                <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Footer summary</label>
                <textarea v-model="draft.settings.footerSummary" rows="4" class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-[#3e8e60]"></textarea>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-[32px] border border-black/5 bg-white p-6 shadow-sm">
          <div class="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p class="text-sm uppercase tracking-[0.35em] text-[#3e8e60]">Team section</p>
              <h2 class="mt-2 text-2xl font-light">Founder profile</h2>
              <p class="mt-3 max-w-2xl text-sm leading-relaxed text-[#162328]/60">
                Add the founder photo, name, and description here. Choose left or right to control how the photo sits on the homepage. Locally, the homepage shows a preview even if these fields are empty. On the live site, this section stays hidden until you add real content.
              </p>
            </div>
          </div>

          <div class="grid gap-8 xl:grid-cols-[0.92fr,1.08fr]">
            <div class="space-y-6">
              <div>
                <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Section eyebrow</label>
                <input v-model="draft.team.eyebrow" placeholder="Team" class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-[#3e8e60]" />
              </div>

              <div>
                <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Section title</label>
                <input v-model="draft.team.title" placeholder="Meet the founder" class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-[#3e8e60]" />
              </div>

              <div>
                <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Founder name</label>
                <input v-model="draft.team.founder.name" placeholder="Founder name" class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-[#3e8e60]" />
              </div>

              <div>
                <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Founder role</label>
                <input v-model="draft.team.founder.role" placeholder="Founder / Principal Architect" class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-[#3e8e60]" />
              </div>

              <div>
                <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Photo side</label>
                <select v-model="draft.team.founder.imagePosition" class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-[#3e8e60]">
                  <option value="left">Photo on the left</option>
                  <option value="right">Photo on the right</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Founder description</label>
                <textarea v-model="draft.team.founder.description" rows="7" placeholder="Write the founder intro here. Leave a blank line between paragraphs if you want multiple paragraphs on the page." class="mt-3 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-[#3e8e60]"></textarea>
              </div>
            </div>

            <div class="space-y-6">
              <div class="rounded-[28px] border border-black/6 bg-[#f8f5ee] p-5">
                <div class="flex items-center justify-between gap-4">
                  <div>
                    <p class="text-sm uppercase tracking-[0.28em] text-[#3e8e60]">Founder photo</p>
                    <p class="mt-2 text-sm text-[#162328]/55">
                      {{ imageInputHelpText }}
                    </p>
                  </div>
                  <label v-if="canUpload" class="inline-flex cursor-pointer rounded-full border border-black/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] transition hover:border-[#3e8e60] hover:text-[#3e8e60]">
                    {{ uploading['team-founder-photo'] ? 'Uploading...' : 'Upload founder photo' }}
                    <input type="file" accept="image/*" class="hidden" @change="updateFounderPhoto($event, draft.team.founder)" />
                  </label>
                </div>

                <div class="mt-5 overflow-hidden rounded-[24px] border border-black/6 bg-white/70">
                  <img
                    v-if="draft.team.founder.photo.url"
                    :src="draft.team.founder.photo.url"
                    :alt="draft.team.founder.photo.alt || draft.team.founder.name || 'Founder photo'"
                    class="aspect-[4/5] w-full object-cover"
                  />
                  <div
                    v-else
                    class="flex aspect-[4/5] items-center justify-center px-8 text-center text-sm uppercase tracking-[0.3em] text-[#162328]/40"
                  >
                    Founder photo preview
                  </div>
                </div>

                <div class="mt-5 grid gap-4 md:grid-cols-2">
                  <input v-model="draft.team.founder.photo.url" placeholder="Founder photo URL" class="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#3e8e60]" />
                  <input v-model="draft.team.founder.photo.alt" placeholder="Founder photo alt text" class="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#3e8e60]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="projects-section" class="rounded-[32px] border border-black/5 bg-white p-6 shadow-sm">
          <div class="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p class="text-sm uppercase tracking-[0.35em] text-[#3e8e60]">Projects</p>
              <h2 class="mt-2 text-2xl font-light">Cards, hero images, gallery, and captions</h2>
              <p class="mt-3 text-sm text-[#162328]/60">
                {{ projectCountLabel }}. Add a brand-new project here, then paste public image URLs for the hero and gallery.
              </p>
            </div>

            <button type="button" class="rounded-full bg-[#162328] px-5 py-3 text-sm font-medium uppercase tracking-[0.22em] text-white transition hover:bg-[#21343a]" @click="addProject">
              Add new project
            </button>
          </div>

          <div class="space-y-8">
            <article
              v-for="(project, projectIndex) in draft.projects"
              :key="project.id"
              :id="project.id"
              class="rounded-[30px] border border-black/6 bg-[#f8f5ee] p-5"
            >
              <div class="flex flex-col gap-4 border-b border-black/8 pb-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <p class="text-sm uppercase tracking-[0.28em] text-[#3e8e60]">Project {{ projectIndex + 1 }}</p>
                  <h3 class="mt-2 text-2xl font-light">{{ project.title || 'Untitled project' }}</h3>
                </div>

                <div class="flex flex-wrap gap-2">
                  <a
                    v-if="project.slug"
                    :href="`/project/${project.slug}`"
                    target="_blank"
                    rel="noreferrer"
                    class="rounded-full border border-black/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] transition hover:border-[#3e8e60] hover:text-[#3e8e60]"
                  >
                    Preview
                  </a>
                  <button type="button" class="rounded-full border border-black/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] transition hover:border-[#3e8e60] hover:text-[#3e8e60]" @click="moveProject(projectIndex, -1)">
                    Move up
                  </button>
                  <button type="button" class="rounded-full border border-black/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] transition hover:border-[#3e8e60] hover:text-[#3e8e60]" @click="moveProject(projectIndex, 1)">
                    Move down
                  </button>
                  <button type="button" class="rounded-full border border-black/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[#b04a3a] transition hover:border-[#b04a3a]" @click="removeProject(projectIndex)">
                    Remove
                  </button>
                </div>
              </div>

              <div class="mt-6 grid gap-8 xl:grid-cols-[0.9fr,1.1fr]">
                <div class="space-y-6">
                  <div>
                    <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Title</label>
                    <input v-model="project.title" class="mt-3 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#3e8e60]" />
                  </div>

                  <div class="grid gap-4 md:grid-cols-[1fr,auto]">
                    <div>
                      <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Slug</label>
                      <input v-model="project.slug" class="mt-3 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#3e8e60]" @change="syncHeroProjectSlug" />
                    </div>
                    <button type="button" class="self-end rounded-full border border-black/10 px-4 py-3 text-xs font-medium uppercase tracking-[0.22em] transition hover:border-[#3e8e60] hover:text-[#3e8e60]" @click="refreshProjectSlug(project)">
                      Generate
                    </button>
                  </div>

                  <div>
                    <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Category</label>
                    <input v-model="project.category" class="mt-3 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#3e8e60]" />
                  </div>

                  <div>
                    <label class="block text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Summary</label>
                    <textarea v-model="project.summary" rows="4" class="mt-3 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#3e8e60]"></textarea>
                  </div>

                  <div class="space-y-4">
                    <div class="flex items-center justify-between">
                      <label class="text-sm font-medium uppercase tracking-[0.18em] text-[#162328]/55">Services</label>
                      <button type="button" class="rounded-full border border-black/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] transition hover:border-[#3e8e60] hover:text-[#3e8e60]" @click="addService(project)">
                        Add service
                      </button>
                    </div>

                    <div v-for="(_, serviceIndex) in project.services" :key="`${project.id}-service-${serviceIndex}`" class="flex items-center gap-3">
                      <input v-model="project.services[serviceIndex]" class="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-[#3e8e60]" />
                      <button type="button" class="rounded-full border border-black/10 px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-[#b04a3a]" @click="removeService(project, serviceIndex)">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>

                <div class="space-y-8">
                  <div class="rounded-[28px] border border-black/6 bg-white p-4">
                    <div class="flex items-center justify-between gap-4">
                      <div>
                        <p class="text-sm uppercase tracking-[0.28em] text-[#3e8e60]">Hero image</p>
                        <p class="mt-2 text-sm text-[#162328]/55">
                          This powers the card and the top of the detail page. {{ imageInputHelpText }}
                        </p>
                      </div>
                      <label v-if="canUpload" class="inline-flex cursor-pointer rounded-full border border-black/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] transition hover:border-[#3e8e60] hover:text-[#3e8e60]">
                        {{ uploading[`hero-${project.id}`] ? 'Uploading...' : 'Upload hero' }}
                        <input type="file" accept="image/*" class="hidden" @change="updateHeroImage($event, project)" />
                      </label>
                    </div>

                    <img
                      v-if="project.heroImage.url"
                      :src="project.heroImage.url"
                      :alt="project.heroImage.alt || project.title"
                      class="mt-4 max-h-[280px] w-full rounded-[20px] object-contain"
                    />

                    <div class="mt-4 grid gap-4 md:grid-cols-2">
                      <input v-model="project.heroImage.url" placeholder="Hero image URL" class="rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 text-sm outline-none transition focus:border-[#3e8e60]" />
                      <input v-model="project.heroImage.alt" placeholder="Hero image alt text" class="rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 text-sm outline-none transition focus:border-[#3e8e60]" />
                    </div>
                    <textarea v-model="project.heroImage.caption" rows="2" placeholder="Hero image caption" class="mt-4 w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 text-sm outline-none transition focus:border-[#3e8e60]"></textarea>
                  </div>

                  <div class="space-y-4">
                    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p class="text-sm uppercase tracking-[0.28em] text-[#3e8e60]">Gallery images</p>
                        <p class="mt-2 text-sm text-[#162328]/55">{{ galleryHelpText }}</p>
                      </div>

                      <div class="flex flex-wrap gap-2">
                        <label v-if="canUpload" class="inline-flex cursor-pointer rounded-full border border-black/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] transition hover:border-[#3e8e60] hover:text-[#3e8e60]">
                          {{ uploading[`gallery-add-${project.id}`] ? 'Uploading...' : 'Upload new image' }}
                          <input type="file" accept="image/*" class="hidden" @change="addGalleryUpload($event, project)" />
                        </label>
                        <button type="button" class="rounded-full border border-black/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] transition hover:border-[#3e8e60] hover:text-[#3e8e60]" @click="addEmptyGalleryImage(project)">
                          Add empty slot
                        </button>
                      </div>
                    </div>

                    <div v-if="project.gallery.length === 0" class="rounded-[24px] border border-dashed border-black/12 bg-white px-5 py-6 text-sm text-[#162328]/55">
                      No gallery images yet.
                    </div>

                    <div v-for="(image, imageIndex) in project.gallery" :key="image.id" class="rounded-[24px] border border-black/6 bg-white p-4">
                      <div class="flex flex-col gap-4 md:flex-row">
                        <img
                          v-if="image.url"
                          :src="image.url"
                          :alt="image.alt || project.title"
                          class="h-36 w-full rounded-[18px] bg-[#f8f5ee] object-contain md:w-48"
                        />

                        <div class="flex-1 space-y-3">
                          <div class="flex flex-wrap gap-2">
                            <button type="button" class="rounded-full border border-black/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] transition hover:border-[#3e8e60] hover:text-[#3e8e60]" @click="useGalleryImageAsHero(project, image)">
                              Use as hero
                            </button>
                            <label v-if="canUpload" class="inline-flex cursor-pointer rounded-full border border-black/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] transition hover:border-[#3e8e60] hover:text-[#3e8e60]">
                              {{ uploading[`gallery-${image.id}`] ? 'Uploading...' : 'Replace image' }}
                              <input type="file" accept="image/*" class="hidden" @change="replaceGalleryImage($event, project, image)" />
                            </label>
                            <button type="button" class="rounded-full border border-black/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[#b04a3a]" @click="removeGalleryImage(project, imageIndex)">
                              Remove
                            </button>
                          </div>

                          <input v-model="image.url" placeholder="Image URL" class="w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 text-sm outline-none transition focus:border-[#3e8e60]" />
                          <input v-model="image.alt" placeholder="Alt text" class="w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 text-sm outline-none transition focus:border-[#3e8e60]" />
                          <textarea v-model="image.caption" rows="2" placeholder="Caption / picture description" class="w-full rounded-2xl border border-black/10 bg-[#f8f5ee] px-4 py-3 text-sm outline-none transition focus:border-[#3e8e60]"></textarea>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
