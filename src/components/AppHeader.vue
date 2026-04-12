<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { useSiteContent } from '../composables/useSiteContent';

const { settings } = useSiteContent();
</script>

<template>
  <nav class="fixed top-0 z-50 w-full border-b border-black/5 bg-[#f5f1e8]/90 text-[#162328] backdrop-blur">
    <div class="flex items-center justify-between gap-4 px-4 py-4 md:px-6">
      <RouterLink to="/" class="shrink-0">
        <img
          :src="settings.logoMarkUrl"
          :alt="settings.brandLogoAlt"
          class="h-10 w-auto object-contain md:h-12"
        />
      </RouterLink>

      <RouterLink
        to="/"
        class="hidden min-w-0 items-center justify-center text-sm font-semibold uppercase tracking-[0.32em] text-[#162328] md:flex"
      >
        {{ settings.brandName }}
      </RouterLink>

      <div class="flex items-center gap-4 text-[11px] font-medium uppercase tracking-[0.22em] md:gap-6 md:text-xs">
        <RouterLink :to="{ path: '/', hash: '#contact' }" class="hover:opacity-70">
          Contact
        </RouterLink>
        <a :href="settings.phoneHref" class="hover:opacity-70">
          {{ settings.phoneDisplay }}
        </a>
      </div>
    </div>
  </nav>
</template>
