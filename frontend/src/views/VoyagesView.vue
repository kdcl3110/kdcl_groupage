<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import TravelCard from '@/components/travel/TravelCard.vue'
import { travelsApi } from '@/api/travels'
import type { Travel } from '@/types'

const travels = ref<Travel[]>([])
const loading = ref(true)
const error = ref('')
const activeFilter = ref('all')

const filters = [
  { key: 'all', label: 'Tous' },
  { key: 'open', label: 'Ouvert' },
  { key: 'full', label: 'Complet' },
  { key: 'in_transit', label: 'En transit' },
  { key: 'delivered', label: 'Livré' },
  { key: 'cancelled', label: 'Annulé' },
]

const filtered = computed(() => {
  if (activeFilter.value === 'all') return travels.value
  return travels.value.filter((t) => t.status === activeFilter.value)
})

async function fetchTravels() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await travelsApi.getAll()
    travels.value = data
  } catch {
    error.value = 'Impossible de charger les voyages. Vérifiez votre connexion.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchTravels)
</script>

<template>
  <AppLayout>
    <div class="p-4 sm:p-6 lg:p-8 flex flex-col gap-5">
      <!-- Page title -->
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-extrabold text-app-primary tracking-tight">Voyages</h1>
        <button
          class="w-9 h-9 rounded-full glass flex items-center justify-center text-app-muted transition-colors active:bg-[var(--glass-bg-hover)] cursor-pointer"
          @click="fetchTravels"
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
      </div>

      <!-- Filter chips -->
      <div class="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
        <button
          v-for="f in filters"
          :key="f.key"
          class="chip"
          :class="{ active: activeFilter === f.key }"
          @click="activeFilter = f.key"
        >
          {{ f.label }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <div v-for="i in 3" :key="i" class="glass rounded-[20px] p-4">
          <div class="skeleton h-5 w-3/5 mb-2" />
          <div class="skeleton h-3.5 w-2/5 mt-2" />
          <div class="skeleton h-2 mt-4" />
          <div class="skeleton h-2 mt-1.5" />
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="flex flex-col items-center gap-3 py-12 px-6 text-center text-app-muted">
        <span class="text-5xl opacity-40">⚠️</span>
        <p class="font-semibold text-app-primary">Erreur de chargement</p>
        <p class="text-sm">{{ error }}</p>
        <button
          class="mt-3 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-[var(--primary)] border-[1.5px] border-[var(--primary)] bg-transparent transition-colors hover:bg-[var(--primary-10)] cursor-pointer"
          @click="fetchTravels"
        >
          Réessayer
        </button>
      </div>

      <!-- Empty -->
      <div v-else-if="filtered.length === 0" class="flex flex-col items-center gap-3 py-12 px-6 text-center text-app-muted">
        <span class="text-5xl opacity-40">🚢</span>
        <p class="font-semibold text-app-primary">Aucun voyage</p>
        <p class="text-sm">
          {{ activeFilter === 'all' ? 'Aucun voyage disponible pour le moment.' : 'Aucun voyage avec ce statut.' }}
        </p>
      </div>

      <!-- List -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <TravelCard
          v-for="travel in filtered"
          :key="travel.travel_id"
          :travel="travel"
        />
      </div>
    </div>
  </AppLayout>
</template>
