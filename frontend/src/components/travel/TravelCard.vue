<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Travel } from '@/types'
import StatusBadge from '@/components/common/StatusBadge.vue'
import LoadBar from '@/components/common/LoadBar.vue'

const props = defineProps<{
  travel: Travel
}>()

const router = useRouter()

const transportIcon = computed(() =>
  props.travel.transport_type === 'ship'
    ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 21c.6.5 1.2 1 2.5 1C7 22 7 20 9.5 20c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
        <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.3.47 4.48 1.62 6"/>
        <path d="M10 14L12 6l2 8"/>
        <line x1="12" y1="2" x2="12" y2="6"/>
        <line x1="8" y1="8" x2="8" y2="8"/>
        <line x1="16" y1="8" x2="16" y2="8"/>
      </svg>`
    : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19 4c-0.7 0-1.2.2-1.5.5L14 8H8l-2.5-4H3l1.5 5.5L2 12l2 2 2-2 1 4 2 1z"/>
      </svg>`
)

const departureLabel = computed(() => {
  if (!props.travel.departure_date) return 'Date non définie'
  return new Date(props.travel.departure_date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
})

function goToDetail() {
  router.push(`/voyages/${props.travel.travel_id}`)
}

function goToForum(e: Event) {
  e.stopPropagation()
  router.push(`/forum?travel_id=${props.travel.travel_id}`)
}
</script>

<template>
  <div
    class="glass rounded-[20px] p-4 flex flex-col gap-3 cursor-pointer transition-all active:scale-[0.99] active:bg-[var(--glass-bg-hover)]"
    @click="goToDetail"
    role="button"
    tabindex="0"
  >
    <!-- Top row: transport + route + status -->
    <div class="flex items-center gap-2.5">
      <!-- Transport icon -->
      <div class="w-9 h-9 rounded-[10px] bg-[var(--primary-15)] border border-[var(--primary-25)] flex items-center justify-center text-[var(--primary)] shrink-0" v-html="transportIcon" />
      <!-- Route -->
      <div class="flex-1 flex items-center gap-1.5 min-w-0 overflow-hidden">
        <span class="text-[15px] font-bold text-app-primary truncate">{{ travel.origin_country }}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-app-muted shrink-0">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
        <span class="text-[15px] font-bold text-app-primary truncate">{{ travel.destination_country }}</span>
      </div>
      <StatusBadge :status="travel.status" />
    </div>

    <!-- Itinerary if present -->
    <p v-if="travel.itinerary" class="text-xs text-app-muted leading-snug">{{ travel.itinerary }}</p>

    <!-- Meta row -->
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-1.5 text-[13px] text-app-muted">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>{{ departureLabel }}</span>
      </div>
      <div class="flex items-center gap-1.5 text-[13px] text-app-muted">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        </svg>
        <span>{{ travel.packages_count }} colis</span>
      </div>
    </div>

    <!-- Load bars -->
    <div class="flex flex-col gap-2">
      <LoadBar
        label="Poids"
        :current="travel.current_weight"
        :max="travel.max_weight"
        unit="kg"
        :percentage="travel.weight_fill_pct"
      />
      <LoadBar
        label="Volume"
        :current="travel.current_volume"
        :max="travel.max_volume"
        unit="m³"
        :percentage="travel.volume_fill_pct"
      />
    </div>

    <!-- Footer -->
    <div class="flex items-center pt-1 border-t border-[var(--glass-border)]">
      <span v-if="travel.container" class="text-xs text-app-muted">🏷 {{ travel.container }}</span>
      <span class="flex-1" />
      <button
        class="flex items-center gap-1 text-xs font-medium text-[var(--primary)] px-2.5 py-1 rounded-full bg-[var(--primary-15)] border border-[var(--primary-20)] transition-colors active:bg-[var(--primary-25)]"
        @click="goToForum"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        Forum
      </button>
    </div>
  </div>
</template>
