<script setup lang="ts">
defineProps<{
  padding?: string
  glow?: boolean
}>()
</script>

<template>
  <div
    class="glass rounded-[20px]"
    :class="[glow ? 'glow-primary border-[rgba(168,19,183,0.3)]' : '']"
    :style="padding ? { padding } : { padding: '16px' }"
  >
    <slot />
  </div>
</template>
