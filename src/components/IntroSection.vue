<script setup lang="ts">
import { useSiteContent } from '../composables/useSiteContent';

const { settings } = useSiteContent();
</script>

<template>
  <section class="bg-[#d7d2c7] px-6 py-24 md:px-12">
    <div class="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.2fr,0.8fr]">
      <div>
        <p class="text-sm uppercase tracking-[0.35em] text-[#3e8e60]">{{ settings.introEyebrow }}</p>
        <h2 class="mt-6 text-4xl font-light leading-tight text-[#162328] md:text-6xl">
          {{ settings.introTitle }}
        </h2>
      </div>

      <div class="space-y-6 text-lg leading-relaxed text-[#162328]/78 md:pt-16">
        <p v-for="paragraph in settings.introParagraphs" :key="paragraph">
          {{ paragraph }}
        </p>
      </div>
    </div>
  </section>
</template>
