<script setup lang="ts">
// In a real scenario, use gsap ScrollTrigger here to pin the section
</script>

<template>
  <section class="relative w-full h-screen flex items-center justify-center overflow-hidden">
    <div class="absolute inset-0 z-0">
        <!-- Using the first image from your HTML dump -->
      <img 
        src="https://cdn.prod.website-files.com/6526826b6b1a6430815a209b/68b6446d3b96ba7135d45520_20250726_121309%20ed.jpg" 
        class="w-full h-full object-cover"
        alt="Hero Project"
      />
    </div>
    
    <div class="absolute bottom-10 left-10 text-white z-10">
        <p class="uppercase tracking-widest text-sm">Scroll Down</p>
    </div>
    
    <div class="absolute bottom-10 right-10 text-white z-10 text-right">
        <p class="text-xl">Project: Halcyon Coves</p>
    </div>
  </section>
</template>
