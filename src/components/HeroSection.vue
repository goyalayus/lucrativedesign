<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { computed } from 'vue';
import { useSiteContent } from '../composables/useSiteContent';

const { settings, projects } = useSiteContent();
const heroProject = computed(() => {
  return (
    projects.value.find(
      (project) => project.slug === settings.value.heroProjectSlug,
    ) ??
    projects.value[0] ??
    null
  );
});
</script>

<template>
  <section class="relative min-h-screen overflow-hidden bg-[#162328]">
    <div v-if="heroProject" class="absolute inset-0">
      <img
        :src="heroProject.heroImage.url"
        :alt="heroProject.heroImage.alt || heroProject.title"
        class="h-full w-full object-cover"
      />
    </div>

    <div class="absolute inset-0 bg-gradient-to-b from-black/25 via-black/15 to-black/65"></div>

    <div class="relative z-10 flex min-h-screen flex-col justify-between px-6 pb-10 pt-28 text-white md:px-12">
      <div class="max-w-2xl">
        <p class="text-sm uppercase tracking-[0.35em] text-white/75">
          {{ settings.heroEyebrow }}
        </p>
        <h1 class="mt-6 text-5xl font-light leading-none md:text-7xl">
          {{ settings.heroTitle }}
        </h1>
        <p class="mt-6 max-w-xl text-lg leading-relaxed text-white/80 md:text-xl">
          {{ settings.heroSubtitle }}
        </p>

        <div class="mt-8 flex flex-wrap gap-4">
          <RouterLink
            :to="{ path: '/', hash: '#project-list' }"
            class="rounded-full bg-white px-6 py-3 text-sm font-medium uppercase tracking-[0.22em] text-[#162328] transition hover:bg-[#d8e5d1]"
          >
            View Projects
          </RouterLink>
          <RouterLink
            :to="{ path: '/', hash: '#contact' }"
            class="rounded-full border border-white/40 px-6 py-3 text-sm font-medium uppercase tracking-[0.22em] text-white transition hover:border-white hover:bg-white/10"
          >
            Contact
          </RouterLink>
        </div>
      </div>

      <div class="flex flex-wrap items-end justify-between gap-4 text-sm uppercase tracking-[0.25em] text-white/80">
        <p>Scroll Down</p>
        <p v-if="heroProject">Project: {{ heroProject.title }}</p>
      </div>
    </div>
  </section>
</template>
