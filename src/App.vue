<script setup lang="ts">
import { onMounted } from 'vue';
import Lenis from '@studio-freight/lenis';

import CustomCursor from './components/CustomCursor.vue';
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';

onMounted(() => {
  const lenis = new Lenis();
  function raf(time: number) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
});
</script>

<template>
  <main class="w-full min-h-screen bg-[#e8e6e1] text-[#222] cursor-none selection:bg-[#aeb3a3] selection:text-white">
    <CustomCursor />
    <AppHeader />
    
    <!-- This is where the HomeView or ProjectDetail will appear -->
    <router-view />

    <AppFooter />
  </main>
</template>
