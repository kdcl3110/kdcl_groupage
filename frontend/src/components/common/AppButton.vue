<script setup lang="ts">
withDefaults(defineProps<{
  loading?: boolean
  disabled?: boolean
  variant?: 'primary' | 'outline'
  full?: boolean
  type?: 'button' | 'submit' | 'reset'
  loadingText?: string
}>(), {
  variant: 'primary',
  full: false,
  type: 'button',
  loadingText: 'Chargement...',
})
</script>

<template>
  <button
    :type="type"
    :disabled="loading || disabled"
    :class="[
      variant === 'primary'
        ? 'btn-primary'
        : 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-[var(--primary)] border-[1.5px] border-[var(--primary)] bg-transparent transition-colors hover:bg-[var(--primary-10)] cursor-pointer disabled:opacity-50',
      full ? 'w-full' : '',
      'flex items-center justify-center gap-2',
    ]"
  >
    <template v-if="loading">
      <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      {{ loadingText }}
    </template>
    <slot v-else />
  </button>
</template>
