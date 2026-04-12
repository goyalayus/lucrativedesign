<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { useSiteContent } from '../composables/useSiteContent';

const { settings } = useSiteContent();
</script>

<template>
  <footer id="contact" class="bg-[#111d20] px-6 pb-10 pt-20 text-white md:px-12">
    <div class="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1.1fr,0.7fr,0.7fr]">
      <div>
        <img
          :src="settings.logoFullUrl"
          :alt="settings.brandLogoAlt"
          class="w-full max-w-sm rounded-2xl bg-white/95 p-4 object-contain"
        />
        <p class="mt-6 text-sm uppercase tracking-[0.3em] text-[#7acc88]">
          {{ settings.footerNote }}
        </p>
        <p class="mt-6 max-w-md text-base leading-relaxed text-white/72">
          {{ settings.footerSummary }}
        </p>
      </div>

      <div>
        <p class="text-sm uppercase tracking-[0.3em] text-white/50">Location</p>
        <p class="mt-4 text-2xl font-light">{{ settings.location }}</p>

        <p class="mt-10 text-sm uppercase tracking-[0.3em] text-white/50">Phone</p>
        <a :href="settings.phoneHref" class="mt-4 block text-2xl font-light hover:text-[#7acc88]">
          {{ settings.phoneDisplay }}
        </a>
      </div>

      <div>
        <p class="text-sm uppercase tracking-[0.3em] text-white/50">Quick links</p>
        <div class="mt-4 flex flex-col gap-3 text-2xl font-light">
          <RouterLink :to="{ path: '/', hash: '#project-list' }" class="hover:text-[#7acc88]">
            Projects
          </RouterLink>
          <RouterLink :to="{ path: '/', hash: '#contact' }" class="hover:text-[#7acc88]">
            Contact
          </RouterLink>
        </div>
      </div>
    </div>

    <div class="mx-auto mt-16 flex max-w-6xl flex-col gap-4 border-t border-white/10 pt-8 text-sm text-white/55 md:flex-row md:items-end md:justify-between">
      <p>{{ settings.brandName }}</p>
      <p>{{ settings.footerSummary }}</p>
    </div>
  </footer>
</template>
