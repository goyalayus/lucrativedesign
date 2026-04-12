<script setup lang="ts">
import { useSiteContent } from '../composables/useSiteContent';

const { settings } = useSiteContent();
</script>

<template>
  <section class="overflow-hidden bg-[#162328] py-24 text-white">
    <div class="container mx-auto px-6 mb-12">
      <h3 class="text-2xl font-light opacity-80">{{ settings.practiceAreasTitle }}</h3>
    </div>

    <div class="relative flex overflow-x-hidden">
      <div class="animate-marquee whitespace-nowrap py-4">
        <span v-for="i in 4" :key="i" class="inline-block">
          <span
            v-for="item in settings.practiceAreas"
            :key="item"
            class="mx-8 inline-flex items-center text-4xl font-light md:text-6xl"
          >
            <span class="mr-6 h-3 w-3 rounded-full bg-[#7acc88]"></span>
            {{ item }}
          </span>
        </span>
      </div>
    </div>

    <div class="relative flex overflow-x-hidden mt-4">
      <div class="animate-marquee-reverse whitespace-nowrap py-4">
        <span v-for="i in 4" :key="i" class="inline-block">
          <span
            v-for="item in [...settings.practiceAreas].reverse()"
            :key="item"
            class="mx-8 inline-flex items-center text-4xl font-light md:text-6xl"
          >
            <span class="mr-6 h-3 w-3 rounded-full bg-[#7acc88]"></span>
            {{ item }}
          </span>
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.animate-marquee {
  animation: marquee 30s linear infinite;
}
.animate-marquee-reverse {
  animation: marquee 30s linear infinite reverse;
}

@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
</style>
