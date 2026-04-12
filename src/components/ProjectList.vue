<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { useSiteContent } from '../composables/useSiteContent';

const { projects, settings } = useSiteContent();
</script>

<template>
  <section id="project-list" class="bg-[#eee8dd] px-6 py-24 md:px-12">
    <div class="mb-20">
      <h2 class="text-5xl font-light tracking-tight text-[#162328] md:text-7xl">
        {{ settings.projectSectionTitle }}
      </h2>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-24">
      <RouterLink
        v-for="(project, index) in projects"
        :key="project.slug"
        :to="`/project/${project.slug}`"
        class="group block"
        :class="{ 'md:mt-20': index % 2 !== 0 }"
      >
        <div class="rounded-[30px] border border-black/5 bg-white p-4 shadow-sm transition duration-300 group-hover:-translate-y-1">
          <div class="flex min-h-[340px] items-center justify-center overflow-hidden rounded-[24px] bg-[#f6f3eb] p-4 md:min-h-[420px]">
            <img
              :src="project.heroImage.url"
              :alt="project.heroImage.alt || project.title"
              class="max-h-[420px] w-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
          </div>
        </div>

        <div class="mt-6 border-t border-black/10 pt-4 text-[#162328]">
          <p class="text-sm uppercase tracking-[0.28em] text-[#3e8e60]">
            {{ project.category }}
          </p>
          <h3 class="mt-3 text-2xl font-light md:text-3xl">
            {{ project.title }}
          </h3>
          <p class="mt-3 max-w-xl text-base leading-relaxed text-[#162328]/70">
            {{ project.summary }}
          </p>
        </div>
      </RouterLink>
    </div>
  </section>
</template>
