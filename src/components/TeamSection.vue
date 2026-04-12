<script setup lang="ts">
import { computed } from 'vue';
import { useSiteContent } from '../composables/useSiteContent';

const { content, settings } = useSiteContent();

const team = computed(() => content.value.team);
const founder = computed(() => team.value.founder);

const hasTeamContent = computed(() => {
  const currentTeam = team.value;
  const currentFounder = currentTeam.founder;

  return [
    currentTeam.eyebrow,
    currentTeam.title,
    currentFounder.name,
    currentFounder.role,
    currentFounder.description,
    currentFounder.photo.url,
  ].some((value) => value.trim());
});

const shouldRenderSection = computed(() => Boolean(team.value));

const displayEyebrow = computed(() => {
  if (team.value.eyebrow.trim()) {
    return team.value.eyebrow;
  }

  return 'Team';
});

const displayTitle = computed(() => {
  if (team.value.title.trim()) {
    return team.value.title;
  }

  return 'Founder';
});

const displayRole = computed(() => {
  if (founder.value.role.trim()) {
    return founder.value.role;
  }

  return '';
});

const displayName = computed(() => {
  if (founder.value.name.trim()) {
    return founder.value.name;
  }

  return '';
});

const descriptionParagraphs = computed(() =>
  founder.value.description
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean),
);

const displayParagraphs = computed(() => {
  if (descriptionParagraphs.value.length > 0) {
    return descriptionParagraphs.value;
  }

  return [
    hasTeamContent.value
      ? ''
      : 'Add the founder photo, name, role, and story from the admin dashboard to replace this starter section.',
  ].filter(Boolean);
});

const mediaOrderClass = computed(() =>
  founder.value.imagePosition === 'right' ? 'lg:order-2' : 'lg:order-1',
);

const copyOrderClass = computed(() =>
  founder.value.imagePosition === 'right' ? 'lg:order-1' : 'lg:order-2',
);

const founderLabel = computed(
  () => displayName.value || settings.value.brandName || 'Founder',
);
</script>

<template>
  <section
    v-if="shouldRenderSection"
    class="bg-[#efe7d9] px-6 py-24 text-[#162328] md:px-12"
  >
    <div class="mx-auto max-w-6xl">
      <div class="mb-12 max-w-2xl">
        <p
          v-if="displayEyebrow"
          class="text-sm uppercase tracking-[0.35em] text-[#3e8e60]"
        >
          {{ displayEyebrow }}
        </p>
        <h2
          v-if="displayTitle"
          class="mt-4 text-4xl font-light leading-tight md:text-6xl"
        >
          {{ displayTitle }}
        </h2>
      </div>

      <div class="grid gap-10 lg:grid-cols-[0.92fr,1.08fr] lg:items-center">
        <div :class="mediaOrderClass">
          <div
            class="overflow-hidden rounded-[32px] border border-black/8 bg-white/65 shadow-sm"
          >
            <img
              v-if="founder.photo.url"
              :src="founder.photo.url"
              :alt="founder.photo.alt || founder.name || 'Founder photo'"
              class="aspect-[4/5] w-full object-cover"
            />
            <div
              v-else
              class="flex aspect-[4/5] items-center justify-center bg-[#d8d2c4] px-8 text-center text-sm uppercase tracking-[0.32em] text-[#162328]/45"
            >
              {{ founderLabel }}
            </div>
          </div>
        </div>

        <div :class="copyOrderClass">
          <p
            v-if="displayRole"
            class="text-sm uppercase tracking-[0.35em] text-[#3e8e60]"
          >
            {{ displayRole }}
          </p>
          <h3
            v-if="displayName"
            class="mt-4 text-4xl font-light leading-tight md:text-5xl"
          >
            {{ displayName }}
          </h3>

          <div
            v-if="displayParagraphs.length > 0"
            class="mt-6 space-y-5 text-lg leading-relaxed text-[#162328]/78"
          >
            <p
              v-for="(paragraph, index) in displayParagraphs"
              :key="`${displayName}-${index}`"
            >
              {{ paragraph }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
