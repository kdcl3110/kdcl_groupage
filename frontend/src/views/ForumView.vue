<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { travelsApi } from '@/api/travels'
import { packagesApi } from '@/api/packages'
import { useAuthStore } from '@/stores/auth'
import type { Travel } from '@/types'

const router = useRouter()
const auth = useAuthStore()

const isClient = computed(() => auth.user?.role === 'client')
const travels = ref<Travel[]>([])
const loading = ref(true)

function transportIcon(type: string) {
  return type === 'ship' ? 'M' : 'A' // used in avatar
}

function formatDate(date: string | null) {
  if (!date) return ''
  const d = new Date(date)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Aujourd\'hui'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

async function fetchTravels() {
  loading.value = true
  try {
    if (isClient.value) {
      // Clients only see forums of travels they participate in
      const { data: pkgResult } = await packagesApi.getAll({ limit: '1000' })
      const travelIds = new Set(
        pkgResult.data
          .filter((p) => ['submitted', 'in_travel', 'in_transit', 'delivered'].includes(p.status) && p.travel_id)
          .map((p) => p.travel_id!),
      )
      if (travelIds.size > 0) {
        const { data: travResult } = await travelsApi.getAll({ limit: '1000' })
        travels.value = travResult.data.filter((t) => travelIds.has(t.travel_id))
      } else {
        travels.value = []
      }
    } else {
      const { data: travResult } = await travelsApi.getAll({ limit: '1000' })
      travels.value = travResult.data
    }
  } catch {
    travels.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchTravels)
</script>

<template>
  <AppLayout>
    <div class="flex flex-col h-[calc(100dvh-64px-calc(80px+24px+env(safe-area-inset-bottom,0px)))] lg:h-[calc(100dvh-64px-32px)]">

      <!-- Header -->
      <div class="px-4 sm:px-6 pt-5 pb-3 shrink-0">
        <h1 class="text-2xl font-extrabold text-app-primary tracking-tight">Forum</h1>
        <p class="text-[13px] text-app-muted mt-0.5">Discussions par voyage</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex flex-col px-4 sm:px-6 gap-0">
        <div v-for="i in 5" :key="i" class="flex items-center gap-3.5 py-4 border-b border-[var(--glass-border)]">
          <div class="skeleton w-12 h-12 rounded-full shrink-0" />
          <div class="flex-1 flex flex-col gap-2">
            <div class="skeleton h-4 w-[55%]" />
            <div class="skeleton h-3 w-[40%]" />
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="travels.length === 0" class="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center text-app-muted">
        <div class="w-16 h-16 rounded-full bg-[var(--primary-10)] flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-[var(--primary)] opacity-60">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <p class="font-semibold text-app-primary">Aucun forum disponible</p>
        <p class="text-sm leading-relaxed">
          {{ isClient ? "Vous ne faites pas encore partie d'un voyage. Soumettez un colis pour rejoindre un voyage." : "Aucun voyage disponible." }}
        </p>
      </div>

      <!-- Chat list -->
      <div v-else class="flex-1 overflow-y-auto scrollbar-hide">
        <div
          v-for="t in travels"
          :key="t.travel_id"
          class="flex items-center gap-3.5 px-4 sm:px-6 py-3.5 border-b border-[var(--glass-border)] cursor-pointer transition-colors active:bg-[var(--glass-bg)]"
          @click="router.push(`/forum/${t.travel_id}`)"
        >
          <!-- Avatar transport -->
          <div
            class="w-12 h-12 rounded-full flex items-center justify-center shrink-0 border border-[var(--primary-25)]"
            :class="t.transport_type === 'ship' ? 'bg-blue-500/10' : 'bg-sky-400/10'"
          >
            <svg v-if="t.transport_type === 'ship'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400">
              <path d="M2 21c.6.5 1.2 1 2.5 1C7 22 7 21 9.5 21s2.5 1 5 1 2.5-1 5-1c1.3 0 1.9.5 2.5 1"/>
              <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/>
              <path d="M19 13V7a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v6"/>
              <path d="M12 10v4"/><path d="M12 2v3"/>
            </svg>
            <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="text-sky-400">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 4H6L4 2 2 2v2l2 2-3 7 2.8.6"/>
              <path d="M15 15l-5.4-5.4"/><path d="M5 19 7 21"/><path d="M19 19l2 2"/>
            </svg>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <p class="text-[15px] font-semibold text-app-primary truncate">
                {{ t.origin.name }} → {{ t.destination.name }}
              </p>
              <span v-if="t.departure_date" class="text-[11px] text-app-faint shrink-0">
                {{ formatDate(t.departure_date) }}
              </span>
            </div>
            <div class="flex items-center justify-between gap-2 mt-0.5">
              <p class="text-[13px] text-app-muted truncate">
                {{ t.itinerary || (t.transport_type === 'ship' ? 'Transport maritime' : 'Transport aérien') }}
              </p>
              <StatusBadge :status="t.status" />
            </div>
          </div>

          <!-- Chevron -->
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-app-faint shrink-0">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
      </div>

    </div>
  </AppLayout>
</template>
