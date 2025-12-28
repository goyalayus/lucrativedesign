<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { projects } from '../data/projects';

const route = useRoute();

// Find the project matching the URL slug
const project = computed(() => {
  return projects.find(p => p.slug === route.params.slug);
});

// Scroll to top when opening a new project
onMounted(() => {
  window.scrollTo(0, 0);
});
</script>

<template>
  <div v-if="project" class="min-h-screen bg-[#e8e6e1] pt-32 pb-20">
    <!-- Header/Hero -->
    <div class="container mx-auto px-6 mb-20">
      <div class="mb-8 border-b border-black/10 pb-8">
        <p class="uppercase tracking-widest text-sm text-gray-500 mb-2">{{ project.category }}</p>
        <h1 class="text-5xl md:text-8xl font-light">{{ project.title }}</h1>
      </div>
      
      <!-- Main Hero Image -->
      <div class="w-full aspect-video overflow-hidden mb-12">
        <img :src="project.heroImg" class="w-full h-full object-cover" />
      </div>

      <!-- Description -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div class="md:col-span-2">
          <h3 class="text-2xl font-light mb-6 opacity-80">Overview</h3>
          <p class="text-xl md:text-2xl leading-relaxed font-light">{{ project.description }}</p>
        </div>
        <div class="md:col-span-1 border-l border-black/10 pl-6 md:pl-12">
          <h4 class="uppercase tracking-widest text-sm mb-4">Services</h4>
          <ul class="space-y-2 opacity-70">
            <li>Urban Design</li>
            <li>Architecture</li>
            <li>Landscape</li>
            <li>Interior Design</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Gallery Grid -->
    <div class="container mx-auto px-6">
      <h3 class="text-2xl font-light mb-12">Gallery</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div v-for="(photo, index) in project.gallery" :key="index" class="w-full aspect-[4/3] bg-gray-200 overflow-hidden">
          <img :src="photo" class="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
        </div>
      </div>
    </div>
  </div>

  <div v-else class="h-screen flex items-center justify-center pt-32">
    <h1 class="text-4xl">Project Not Found</h1>
  </div>
</template>
