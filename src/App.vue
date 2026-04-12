<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Lenis from '@studio-freight/lenis';

import CustomCursor from './components/CustomCursor.vue';
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';
import { useSiteContent } from './composables/useSiteContent';

const route = useRoute();
const { loadContent } = useSiteContent();
const isAdminRoute = computed(() => route.path.startsWith('/admin'));

onMounted(() => {
  loadContent();

  const lenis = new Lenis();
  function raf(time: number) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
});
</script>

<template>
  <main
    class="w-full min-h-screen"
    :class="
      isAdminRoute
        ? 'bg-[#f6f3eb] text-[#162328] selection:bg-[#dbe3d7] selection:text-[#162328]'
        : 'bg-[#e8e6e1] text-[#222] cursor-none selection:bg-[#aeb3a3] selection:text-white'
    "
  >
    <CustomCursor v-if="!isAdminRoute" />
    <AppHeader v-if="!isAdminRoute" />

    <router-view />

    <AppFooter v-if="!isAdminRoute" />
  </main>
</template>
