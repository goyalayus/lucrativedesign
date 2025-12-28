<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <nav class="fixed top-0 w-full z-50 mix-blend-difference text-white p-6 flex justify-between items-center bg-transparent">
    <!-- Left: Logo SVG -->
    <RouterLink to="/" class="w-10 h-auto text-tan mix-blend-difference">
      <svg viewBox="0 0 33 37" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.8957 23.5685H10.2445L16.551 7.32065L22.2543 22.007V21.9999L28.0482 36.7544H32.9169V33.368L20.1084 1.49316H12.996L0.1875 33.368V36.7544H5.08726L8.13917 28.9021H20.8142L22.8957 23.5685Z" fill="currentColor"></path>
      </svg>
    </RouterLink>

    <!-- Center: Wordmark (Hidden on mobile to save space, visible on Desktop) -->
    <div class="hidden md:block">
       <span class="font-bold text-xl tracking-widest uppercase text-tan mix-blend-difference">Archipelago</span>
    </div>

    <!-- Right: Founders Link & Phone Number -->
    <div class="flex items-center gap-6 md:gap-8 text-tan mix-blend-difference">
      
      <!-- Link to Founders Page -->
      <RouterLink to="/founders" class="uppercase tracking-widest text-sm hover:underline font-medium">
        Founders
      </RouterLink>

      <!-- Indian Phone Number -->
      <a href="tel:+919876543210" class="uppercase tracking-widest text-sm hover:opacity-70 font-medium">
        +91 98765 43210
      </a>

    </div>
  </nav>
</template>
