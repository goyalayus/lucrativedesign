<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useSiteContent } from '../composables/useSiteContent';

const route = useRoute();
const { projects } = useSiteContent();

const project = computed(() => {
  return projects.value.find((entry) => entry.slug === route.params.slug);
});

onMounted(() => {
  window.scrollTo(0, 0);
});
</script>

<template>
  <div v-if="project" class="min-h-screen bg-[#eee8dd] pb-20 pt-32">
    <div class="container mx-auto mb-20 px-6">
      <div class="mb-10 border-b border-black/10 pb-8">
        <p class="mb-2 text-sm uppercase tracking-[0.3em] text-[#3e8e60]">
          {{ project.category }}
        </p>
        <h1 class="text-5xl font-light text-[#162328] md:text-8xl">
          {{ project.title }}
        </h1>
        <p class="mt-6 max-w-3xl text-xl font-light leading-relaxed text-[#162328]/78 md:text-2xl">
          {{ project.summary }}
        </p>
      </div>

      <div class="mb-12 rounded-[32px] border border-black/5 bg-white p-4 shadow-sm">
        <img
          :src="project.heroImage.url"
          :alt="project.heroImage.alt || project.title"
          class="mx-auto max-h-[75vh] w-full object-contain"
        />
        <figcaption
          v-if="project.heroImage.caption"
          class="mt-4 text-sm uppercase tracking-[0.2em] text-[#162328]/55"
        >
          {{ project.heroImage.caption }}
        </figcaption>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div class="md:col-span-2">
          <h3 class="mb-6 text-2xl font-light text-[#162328]/80">Overview</h3>
          <p class="text-xl font-light leading-relaxed text-[#162328]/78 md:text-2xl">
            {{ project.summary }}
          </p>
        </div>
        <div class="border-l border-black/10 pl-6 md:col-span-1 md:pl-12">
          <h4 class="mb-4 text-sm uppercase tracking-[0.3em] text-[#3e8e60]">Services</h4>
          <ul class="space-y-2 text-lg text-[#162328]/72">
            <li v-for="service in project.services" :key="service">
              {{ service }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="container mx-auto px-6">
      <h3 class="mb-12 text-2xl font-light text-[#162328]">Gallery</h3>
      <div class="columns-1 gap-6 md:columns-2">
        <figure
          v-for="image in project.gallery"
          :key="image.id"
          class="mb-6 break-inside-avoid rounded-[32px] border border-black/5 bg-white p-4 shadow-sm"
        >
          <img
            :src="image.url"
            :alt="image.alt || project.title"
            class="w-full object-contain"
          />
          <figcaption
            v-if="image.caption"
            class="mt-4 text-sm leading-relaxed text-[#162328]/60"
          >
            {{ image.caption }}
          </figcaption>
        </figure>
      </div>
    </div>
  </div>

  <div v-else class="h-screen flex items-center justify-center pt-32">
    <h1 class="text-4xl">Project Not Found</h1>
  </div>
</template>
