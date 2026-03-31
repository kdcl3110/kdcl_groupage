<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  current: number
  max: number
  unit: string
  percentage: number
}>()

const clampedPct = computed(() => Math.min(100, Math.max(0, props.percentage)))

const barColor = computed(() => {
  if (clampedPct.value >= 90) return '#f87171'
  if (clampedPct.value >= 70) return '#fb923c'
  return 'var(--color-primary)'
})
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex items-center justify-between">
      <span class="text-[13px] font-semibold text-app-muted uppercase tracking-[0.04em]">{{ label }}</span>
      <span class="text-[13px] text-app-muted">
        <span class="text-app-primary font-bold">{{ current.toFixed(1) }}</span>
        <span> / </span>
        <span>{{ max.toFixed(1) }} {{ unit }}</span>
        <span class="text-app-muted"> · {{ clampedPct.toFixed(0) }}%</span>
      </span>
    </div>
    <div class="h-2 bg-white/[0.08] rounded-full overflow-hidden">
      <div
        class="h-full rounded-full shadow-[0_0_8px_var(--primary-50)] transition-[width] duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]"
        :style="{ width: clampedPct + '%', background: barColor }"
      />
    </div>
  </div>
</template>
