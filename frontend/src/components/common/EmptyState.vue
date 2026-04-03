<script setup lang="ts">
defineProps<{
  title: string
  message?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center gap-3 py-12 px-6 text-center text-app-muted">
    <div v-if="$slots.icon" class="text-app-faint opacity-50">
      <slot name="icon" />
    </div>
    <p class="font-semibold text-app-primary">{{ title }}</p>
    <p v-if="message" class="text-sm">{{ message }}</p>
    <slot />
  </div>
</template>
