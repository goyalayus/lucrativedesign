<script setup lang="ts">
import { projects } from '../data/projects';
import { RouterLink } from 'vue-router';
</script>

<template>
  <section id="project-list" class="py-24 px-6 md:px-12 bg-[#e8e6e1]">
    <div class="mb-20">
        <h2 class="text-5xl md:text-7xl font-light tracking-tight">Featured Projects</h2>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-24">
      <!-- We now loop through the real data -->
      <RouterLink 
        v-for="(project, index) in projects" 
        :key="index" 
        :to="`/project/${project.slug}`"
        class="group cursor-pointer relative block"
        :class="{ 'md:mt-32': index % 2 !== 0 }" 
      >
        <!-- Image Container -->
        <div class="overflow-hidden w-full aspect-[4/3] mb-6 bg-gray-300">
            <img 
              :src="project.heroImg" 
              class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
        </div>
        
        <!-- Marquee Text Effect -->
        <div class="overflow-hidden border-t border-black/20 pt-4">
            <div class="relative">
                <p class="text-xl md:text-2xl uppercase tracking-wider transition-opacity duration-300 group-hover:opacity-0">
                    {{ project.title }}
                </p>
                <div class="absolute top-0 left-0 w-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div class="flex gap-8 animate-marquee">
                        <span class="text-xl md:text-2xl uppercase tracking-wider">{{ project.title }}</span>
                        <span class="text-xl md:text-2xl uppercase tracking-wider italic text-gray-500">{{ project.title }}</span>
                        <span class="text-xl md:text-2xl uppercase tracking-wider">{{ project.title }}</span>
                    </div>
                </div>
            </div>
        </div>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.animate-marquee {
    animation: marquee 5s linear infinite;
}
@keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
}
</style>
