<script setup lang="ts">
import { onMounted, ref } from 'vue';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// FIX 1: Explicitly tell TypeScript these will be HTML Elements
const sectionRef = ref<HTMLElement | null>(null);
const maskRef = ref<HTMLElement | null>(null);

onMounted(() => {
  // FIX 2: Add a safety check. If the element doesn't exist, stop.
  if (!sectionRef.value || !maskRef.value) return;

  const ctx = gsap.context(() => {
    gsap.fromTo(
      maskRef.value,
      { 
        "--mask-size": "20%" 
      },
      {
        "--mask-size": "300%", 
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.value,
          start: "top top", 
          end: "+=1500", 
          scrub: 1, 
          pin: true, 
        }
      }
    );
  }, sectionRef.value); // TypeScript now knows this is a valid Element

  return () => ctx.revert(); 
});
</script>

<template>
  <section ref="sectionRef" class="relative w-full h-screen flex items-center justify-center bg-white overflow-hidden">
    
    <div ref="maskRef" class="mask-container w-full h-full flex items-center justify-center">
      <iframe 
        src="https://player.vimeo.com/video/877769402?background=1&autoplay=1&loop=1&byline=0&title=0" 
        class="w-full h-full object-cover pointer-events-none scale-110" 
        frameborder="0" 
        allow="autoplay; fullscreen"
      ></iframe>
    </div>

  </section>
</template>

<style scoped>
.mask-container {
  --mask-size: 20%;
  
  mask-image: url('https://cdn.prod.website-files.com/65249822a54c89915817034b/652f74f0c512113d14cb58b8_archipelago-reveal-logo.svg');
  mask-repeat: no-repeat;
  mask-position: center;
  mask-size: var(--mask-size);
  
  -webkit-mask-image: url('https://cdn.prod.website-files.com/65249822a54c89915817034b/652f74f0c512113d14cb58b8_archipelago-reveal-logo.svg');
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  -webkit-mask-size: var(--mask-size);
}
</style>
