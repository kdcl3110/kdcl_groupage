<script setup lang="ts">
defineProps<{
  icon?: string
  title: string
  message?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center gap-3 py-12 px-6 text-center text-app-muted">
    <span v-if="icon" class="text-5xl opacity-40">{{ icon }}</span>
    <p class="font-semibold text-app-primary">{{ title }}</p>
    <p v-if="message" class="text-sm">{{ message }}</p>
    <slot />
  </div>
</template>
