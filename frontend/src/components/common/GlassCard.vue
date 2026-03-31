<script setup lang="ts">
defineProps<{
  padding?: string
  glow?: boolean
}>()
</script>

<template>
  <div
    class="glass rounded-[20px]"
    :class="[glow ? 'glow-primary border-[var(--primary-30)]' : '']"
    :style="padding ? { padding } : { padding: '16px' }"
  >
    <slot />
  </div>
</template>
