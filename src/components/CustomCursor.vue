<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import gsap from 'gsap';

const cursor = ref<HTMLElement | null>(null);

const moveCursor = (e: MouseEvent) => {
  if (cursor.value) {
    // We use .set first to ensure instant response, or quick .to
    gsap.to(cursor.value, {
      x: e.clientX,
      y: e.clientY,
      duration: 0.1,
      ease: 'power2.out'
    });
  }
};

onMounted(() => {
  window.addEventListener('mousemove', moveCursor);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', moveCursor);
});
</script>

<template>
  <!-- 
    Removed 'mix-blend-difference' so it remains solid black/orange. 
    Added 'pointer-events-none' so it doesn't block clicks.
  -->
  <div 
    ref="cursor" 
    class="fixed top-0 left-0 z-[9999] pointer-events-none -translate-x-1/2 -translate-y-1/2"
  >
    <!-- The Dot -->
    <div class="w-4 h-4 bg-[#ff6b00] rounded-full shadow-sm"></div>
  </div>
</template>
