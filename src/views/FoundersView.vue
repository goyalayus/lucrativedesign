<script setup lang="ts">
import { onMounted } from 'vue';

onMounted(() => {
  window.scrollTo(0, 0);
});
</script>

<template>
  <div class="min-h-screen bg-[#e8e6e1] pt-32 pb-20">
    <div class="container mx-auto px-6">
      
      <!-- Page Title -->
      <div class="mb-20 border-b border-black/10 pb-8">
        <h1 class="text-5xl md:text-8xl font-light">The Founders</h1>
      </div>

      <!-- Founders Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
        
        <!-- Founder 1 -->
        <div class="flex flex-col gap-6">
          <div class="w-full aspect-[3/4] bg-gray-300 overflow-hidden relative group">
            <img 
              src="https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1000&auto=format&fit=crop" 
              alt="Founder 1" 
              class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
          <div>
            <h2 class="text-3xl font-light">Arjun Mehta</h2>
            <p class="text-sm uppercase tracking-widest opacity-60 mt-1">Principal Architect</p>
            <p class="mt-4 text-lg font-light leading-relaxed opacity-80">
              With over 20 years of experience in urban design, Arjun leads the practice with a focus on sustainable city-making and human-centric infrastructure.
            </p>
          </div>
        </div>

        <!-- Founder 2 -->
        <div class="flex flex-col gap-6 md:mt-32">
          <div class="w-full aspect-[3/4] bg-gray-300 overflow-hidden relative group">
            <img 
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1000&auto=format&fit=crop" 
              alt="Founder 2" 
              class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
          <div>
            <h2 class="text-3xl font-light">Priya Sharma</h2>
            <p class="text-sm uppercase tracking-widest opacity-60 mt-1">Design Director</p>
            <p class="mt-4 text-lg font-light leading-relaxed opacity-80">
              Priya challenges conventional boundaries, bringing a unique perspective to interior landscapes and public spaces that fosters community connection.
            </p>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
