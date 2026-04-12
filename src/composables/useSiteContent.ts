import { computed, readonly, ref } from 'vue';
import { cloneSiteContent, defaultSiteContent } from '../lib/content/defaultContent';
import { normalizeSiteContent } from '../lib/content/normalize';
import type { SiteContent } from '../lib/content/types';

const content = ref<SiteContent>(cloneSiteContent(defaultSiteContent));
const isLoading = ref(false);
const hasLoaded = ref(false);
const loadError = ref<string | null>(null);

async function loadContent(force = false): Promise<void> {
  if (isLoading.value) {
    return;
  }

  if (hasLoaded.value && !force) {
    return;
  }

  isLoading.value = true;

  try {
    const response = await fetch('/api/content', {
      headers: {
        accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Unable to load site content (${response.status})`);
    }

    const nextContent = normalizeSiteContent(await response.json());
    content.value = nextContent;
    hasLoaded.value = true;
    loadError.value = null;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to load site content.';
    loadError.value = message;
  } finally {
    isLoading.value = false;
  }
}

function replaceContent(nextContent: SiteContent): void {
  content.value = normalizeSiteContent(nextContent);
  hasLoaded.value = true;
  loadError.value = null;
}

export function useSiteContent() {
  return {
    content: readonly(content),
    settings: computed(() => content.value.settings),
    projects: computed(() => content.value.projects),
    isLoading: readonly(isLoading),
    hasLoaded: readonly(hasLoaded),
    loadError: readonly(loadError),
    loadContent,
    replaceContent,
  };
}
