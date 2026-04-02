<script setup lang="ts">
defineProps<{ loading?: boolean }>()
defineEmits<{ click: [] }>()
</script>

<template>
  <button
    class="w-9 h-9 rounded-full glass flex items-center justify-center text-app-muted transition-colors active:bg-[var(--glass-bg-hover)] cursor-pointer"
    @click="$emit('click')"
    :disabled="loading"
    aria-label="Actualiser"
  >
    <svg
      width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      :class="loading ? 'animate-spin' : ''"
    >
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  </button>
</template>
