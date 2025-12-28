<script setup lang="ts">
const items = [
  "Logan Gold Coast Faster Rail",
  "Ipswich Hospital",
  "Coomera Connector",
  "Future Medical Facility",
  "Yeronga Community Centre",
  "Pomona Placemaking Pilot"
];
</script>

<template>
  <section class="py-24 bg-olive text-white overflow-hidden">
    <div class="container mx-auto px-6 mb-12">
      <h3 class="text-2xl font-light opacity-80">What we're currently working on</h3>
    </div>

    <!-- Row 1: Left to Right -->
    <div class="relative flex overflow-x-hidden">
      <div class="animate-marquee whitespace-nowrap py-4">
        <span v-for="i in 4" :key="i" class="inline-block">
            <span v-for="item in items" :key="item" class="mx-8 text-4xl md:text-6xl font-light inline-flex items-center">
                <span class="w-3 h-3 bg-tan rounded-full mr-6"></span>
                {{ item }}
            </span>
        </span>
      </div>
    </div>

    <!-- Row 2: Right to Left (Reverse) -->
    <div class="relative flex overflow-x-hidden mt-4">
      <div class="animate-marquee-reverse whitespace-nowrap py-4">
        <span v-for="i in 4" :key="i" class="inline-block">
            <span v-for="item in [...items].reverse()" :key="item" class="mx-8 text-4xl md:text-6xl font-light inline-flex items-center">
                 <span class="w-3 h-3 bg-tan rounded-full mr-6"></span>
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
