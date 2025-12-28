<script setup lang="ts">
import { onMounted } from 'vue';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const stats = [
  { value: 100, label: "Workshops this year" },
  { value: 12, label: "Games Precincts & Overlay Plans" },
  { value: 1250, label: "Dwellings on our boards" },
  { value: 100, label: "City Shaping Master Planning" },
  { value: 40, label: "People-oriented precincts" },
  { value: 20, label: "Beautiful bridges" }
];

onMounted(() => {
  stats.forEach((stat, index) => {
    const obj = { count: 0 };
    const element = document.getElementById(`stat-${index}`);
    
    if (element) {
      gsap.to(obj, {
        count: stat.value,
        duration: 2,
        ease: "power2.out",
        scrollTrigger: {
          trigger: element,
          start: "top 80%",
        },
        onUpdate: () => {
          element.innerHTML = Math.ceil(obj.count) + (stat.value >= 100 ? '+' : '');
        }
      });
    }
  });
});
</script>

<template>
  <section class="py-32 px-6 bg-[#aeb3a3] text-[#222]">
    <div class="container mx-auto">
      <div class="mb-20 max-w-2xl">
        <h2 class="text-5xl md:text-6xl font-light mb-8">We're City Making Design Leaders</h2>
        <button class="px-8 py-3 border border-black rounded-full hover:bg-black hover:text-white transition-colors duration-300 uppercase text-sm tracking-widest">
            Discover Our Process
        </button>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 gap-12 border-t border-black/10 pt-12">
        <div v-for="(stat, index) in stats" :key="index" class="flex flex-col gap-2">
            <span :id="`stat-${index}`" class="text-6xl md:text-8xl font-light">0</span>
            <span class="text-lg opacity-80 max-w-[200px]">{{ stat.label }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
