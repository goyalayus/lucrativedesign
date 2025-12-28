<script setup lang="ts">
import { onMounted, ref } from 'vue';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const sectionRef = ref(null);
const maskRef = ref(null);

onMounted(() => {
  const ctx = gsap.context(() => {
    gsap.fromTo(
      maskRef.value,
      { 
        // Start state: Small logo in the center
        "--mask-size": "20%" 
      },
      {
        // End state: Logo grows huge to reveal full video
        "--mask-size": "300%", 
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.value,
          start: "top top", 
          end: "+=1500", // Scroll distance duration
          scrub: 1, // Smooth scrubbing effect
          pin: true, // Lock the section in place while animating
        }
      }
    );
  }, sectionRef.value); // Scope GSAP to this component

  return () => ctx.revert(); // Cleanup on unmount
});
</script>

<template>
  <section ref="sectionRef" class="relative w-full h-screen flex items-center justify-center bg-white overflow-hidden">
    
    <!-- The Mask Container -->
    <div ref="maskRef" class="mask-container w-full h-full flex items-center justify-center">
      <!-- The Video -->
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
  /* Use CSS variable for GSAP to animate efficiently */
  --mask-size: 20%;
  
  /* The Image used as the mask */
  mask-image: url('https://cdn.prod.website-files.com/65249822a54c89915817034b/652f74f0c512113d14cb58b8_archipelago-reveal-logo.svg');
  mask-repeat: no-repeat;
  mask-position: center;
  
  /* Bind size to the variable */
  mask-size: var(--mask-size);
  
  /* Webkit support */
  -webkit-mask-image: url('https://cdn.prod.website-files.com/65249822a54c89915817034b/652f74f0c512113d14cb58b8_archipelago-reveal-logo.svg');
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  -webkit-mask-size: var(--mask-size);
}
</style>
