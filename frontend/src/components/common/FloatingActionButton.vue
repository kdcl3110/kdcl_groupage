<script setup lang="ts">
defineProps<{ ariaLabel?: string }>()
defineEmits<{ click: [] }>()
</script>

<template>
  <button
    class="fixed bottom-22 sm:bottom-20 right-4 sm:right-6 lg:right-8 w-14 h-14 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] glow-primary shadow-[0_4px_16px_rgba(0,0,0,0.3)] flex items-center justify-center cursor-pointer z-50 border-none text-white transition-all active:scale-[0.93]"
    @click="$emit('click')"
    :aria-label="ariaLabel"
  >
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  </button>
</template>
