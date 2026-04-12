<script setup lang="ts">
import { useSiteContent } from '../composables/useSiteContent';

const { settings } = useSiteContent();
</script>

<template>
  <section class="bg-[#dbe3d7] px-6 py-24 text-[#162328] md:px-12">
    <div class="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1.1fr,0.9fr]">
      <div>
        <p class="text-sm uppercase tracking-[0.35em] text-[#3e8e60]">{{ settings.highlightEyebrow }}</p>
        <div class="mt-8 flex flex-col gap-4 md:flex-row md:items-end">
          <span class="text-7xl font-light leading-none md:text-8xl">
            {{ settings.highlightValue }}
          </span>
          <h2 class="max-w-md text-2xl font-light leading-tight md:pb-3 md:text-3xl">
            {{ settings.highlightTitle }}
          </h2>
        </div>
      </div>

      <div class="grid gap-4">
        <div
          v-for="card in settings.highlightCards"
          :key="card.title"
          class="rounded-[24px] border border-black/8 bg-white/70 p-6"
        >
          <h3 class="text-xl font-medium">{{ card.title }}</h3>
          <p class="mt-3 max-w-md text-base leading-relaxed text-[#162328]/72">
            {{ card.description }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
