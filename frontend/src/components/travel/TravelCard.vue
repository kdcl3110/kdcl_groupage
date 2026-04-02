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

const STATUS_COLORS: Record<string, string> = {
  open:       '#4ade80',
  full:       '#fb923c',
  in_transit: '#60a5fa',
  delivered:  '#2dd4bf',
  cancelled:  '#f87171',
}

const accentColor = computed(() => STATUS_COLORS[props.travel.status] ?? '#9ca3af')

const isShip = computed(() => props.travel.transport_type === 'ship')

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
    class="glass rounded-[20px] overflow-hidden cursor-pointer transition-all duration-150 active:scale-[0.99] border-t-[3px]"
    :style="`border-top-color: ${accentColor};`"
    @click="goToDetail"
    role="button"
    tabindex="0"
  >
    <div class="p-4 flex flex-col gap-3">

      <!-- Route row -->
      <div class="flex items-center gap-2.5">
        <!-- Transport icon -->
        <div
          class="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 border"
          :style="`background: color-mix(in srgb, ${accentColor} 12%, transparent); border-color: color-mix(in srgb, ${accentColor} 25%, transparent); color: ${accentColor};`"
        >
          <!-- Ship -->
          <svg v-if="isShip" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 21c.6.5 1.2 1 2.5 1C7 22 7 20 9.5 20c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
            <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/>
            <path d="M19 13V7a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v6"/>
            <path d="M12 10v4"/><path d="M12 2v3"/>
          </svg>
          <!-- Plane -->
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 4H6L4 2 2 2v2l2 2-3 7 2.8.6"/>
            <path d="M15 15l-5.4-5.4"/>
            <path d="M5 19 7 21"/><path d="M19 19l2 2"/>
          </svg>
        </div>

        <!-- Route -->
        <div class="flex-1 flex items-center gap-1.5 min-w-0 overflow-hidden">
          <span class="text-[15px] font-bold text-app-primary truncate">{{ travel.origin.name }}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-app-faint shrink-0">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
          <span class="text-[15px] font-bold text-app-primary truncate">{{ travel.destination.name }}</span>
        </div>

        <StatusBadge :status="travel.status" />
      </div>

      <!-- Itinerary -->
      <p v-if="travel.itinerary" class="text-[12px] text-app-muted leading-snug -mt-1">{{ travel.itinerary }}</p>

      <!-- Single load bar: volume for ship, weight for plane -->
      <LoadBar
        v-if="isShip"
        label="Volume"
        :current="travel.current_volume"
        :max="travel.max_volume"
        unit="m³"
        :percentage="travel.volume_fill_pct"
      />
      <LoadBar
        v-else
        label="Poids"
        :current="travel.current_weight"
        :max="travel.max_weight"
        unit="kg"
        :percentage="travel.weight_fill_pct"
      />

      <!-- Footer row -->
      <div class="flex items-center gap-3 pt-0.5 border-t border-[var(--glass-border)]">
        <span class="flex items-center gap-1.5 text-[12px] text-app-muted">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {{ departureLabel }}
        </span>
        <span class="flex items-center gap-1.5 text-[12px] text-app-muted">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          {{ travel.packages_count }} colis
        </span>
        <span v-if="travel.container" class="flex items-center gap-1 text-[12px] text-app-faint truncate">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
          {{ travel.container }}
        </span>
        <span class="flex-1" />
        <button
          class="flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-full border transition-colors active:opacity-70 shrink-0"
          :style="`color: ${accentColor}; background: color-mix(in srgb, ${accentColor} 10%, transparent); border-color: color-mix(in srgb, ${accentColor} 20%, transparent);`"
          @click="goToForum"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Forum
        </button>
      </div>
    </div>
  </div>
</template>
