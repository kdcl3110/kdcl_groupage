<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ password: string }>()

const strength = computed(() => {
  const p = props.password
  if (!p) return 0
  let score = 0
  if (p.length >= 8) score++
  if (/[A-Z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  return score
})

const strengthColor = computed(() =>
  ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400'][strength.value] ?? '',
)

const strengthLabel = computed(() =>
  ['', 'Faible', 'Moyen', 'Bon', 'Fort'][strength.value] ?? '',
)
</script>

<template>
  <div v-if="password" class="flex flex-col gap-1">
    <div class="flex gap-1">
      <div
        v-for="i in 4" :key="i"
        class="flex-1 h-1 rounded-full transition-all duration-300"
        :class="i <= strength ? strengthColor : 'bg-white/10'"
      />
    </div>
    <p class="text-[11px]" :class="strengthColor.replace('bg-', 'text-')">{{ strengthLabel }}</p>
  </div>
</template>
