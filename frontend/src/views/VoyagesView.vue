<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import TravelCard from '@/components/travel/TravelCard.vue'
import TravelFormSheet from '@/components/travel/TravelFormSheet.vue'
import type { TravelFormData } from '@/components/travel/TravelFormSheet.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import AppButton from '@/components/common/AppButton.vue'
import RefreshButton from '@/components/common/RefreshButton.vue'
import FloatingActionButton from '@/components/common/FloatingActionButton.vue'
import { AlertCircle, Ship } from 'lucide-vue-next'
import { travelsApi } from '@/api/travels'
import { packagesApi } from '@/api/packages'
import { useAuthStore } from '@/stores/auth'
import type { Travel, Package } from '@/types'

const auth = useAuthStore()
const isManager = computed(() => auth.user?.role === 'freight_forwarder' || auth.user?.role === 'admin')
const isClient = computed(() => auth.user?.role === 'client')

const travels = ref<Travel[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(false)
const offset = ref(0)
const PAGE_SIZE = 10
const error = ref('')

// Manager filters (by travel status)
const activeFilter = ref('all')
const filters = [
  { key: 'all',        label: 'Tous' },
  { key: 'open',       label: 'Ouvert' },
  { key: 'full',       label: 'Complet' },
  { key: 'in_transit', label: 'En transit' },
  { key: 'delivered',  label: 'Livré' },
  { key: 'cancelled',  label: 'Annulé' },
]

// Client tabs
const clientTab = ref<'available' | 'mine'>('available')
const myPackages = ref<Package[]>([])

const myTravelIds = computed(() => {
  const ids = new Set<number>()
  for (const pkg of myPackages.value) {
    if (pkg.travel_id) ids.add(pkg.travel_id)
  }
  return ids
})

const filtered = computed(() => {
  if (isManager.value) return travels.value
  if (clientTab.value === 'available') {
    return travels.value.filter(
      t => (t.status === 'open' || t.status === 'full') && !myTravelIds.value.has(t.travel_id)
    )
  }
  // "mine" — voyages où le client a au moins un colis
  return travels.value.filter(t => myTravelIds.value.has(t.travel_id))
})

async function fetchTravels(reset = true) {
  if (reset) {
    offset.value = 0
    travels.value = []
    loading.value = true
  } else {
    loadingMore.value = true
  }
  error.value = ''
  try {
    if (isClient.value) {
      // Clients : un seul chargement, haute limite, pas de pagination
      const [travRes, pkgRes] = await Promise.all([
        travelsApi.getAll({ limit: '500', offset: '0' }),
        packagesApi.getAll({ limit: '1000' }),
      ])
      travels.value = travRes.data.data
      hasMore.value = false
      myPackages.value = pkgRes.data.data
    } else {
      const params: Record<string, string> = {
        limit: String(PAGE_SIZE),
        offset: String(offset.value),
      }
      if (isManager.value && activeFilter.value !== 'all') {
        params.status = activeFilter.value
      }
      const travRes = await travelsApi.getAll(params)
      const { data: newTravels, hasMore: more } = travRes.data
      travels.value = reset ? newTravels : [...travels.value, ...newTravels]
      hasMore.value = more
      offset.value += newTravels.length
    }
  } catch {
    error.value = 'Impossible de charger les voyages. Vérifiez votre connexion.'
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// Quand le manager change le filtre de statut, on recharge depuis le début
watch(activeFilter, () => { if (isManager.value) fetchTravels(true) })

// Creation sheet
const showSheet = ref(false)
const formLoading = ref(false)
const formError = ref('')
const todayStr = new Date().toISOString().split('T')[0]

async function handleCreate(data: TravelFormData) {
  formError.value = ''
  if (!data.origin_country_id || !data.destination_country_id) {
    formError.value = 'Les pays d\'origine et de destination sont obligatoires.'
    return
  }
  if (data.origin_country_id === data.destination_country_id) {
    formError.value = 'Le pays d\'origine et le pays de destination doivent être différents.'
    return
  }
  if (data.departure_date) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (new Date(data.departure_date) < today) {
      formError.value = 'La date de départ ne peut pas être antérieure à aujourd\'hui.'
      return
    }
  }
  if (data.departure_date && data.estimated_arrival_date) {
    if (new Date(data.estimated_arrival_date) <= new Date(data.departure_date)) {
      formError.value = 'La date d\'arrivée estimée doit être postérieure à la date de départ.'
      return
    }
  }
  if (!data.max_weight || parseFloat(data.max_weight) <= 0) {
    formError.value = 'Le poids maximum doit être supérieur à 0.'
    return
  }
  if (!data.max_volume || parseFloat(data.max_volume) <= 0) {
    formError.value = 'Le volume maximum doit être supérieur à 0.'
    return
  }

  formLoading.value = true
  try {
    const payload: Record<string, unknown> = {
      transport_type: data.transport_type,
      origin_country_id: parseInt(data.origin_country_id),
      destination_country_id: parseInt(data.destination_country_id),
      max_weight: parseFloat(data.max_weight),
      max_volume: parseFloat(data.max_volume),
      min_load_percentage: parseInt(data.min_load_percentage, 10),
      max_load_percentage: parseInt(data.max_load_percentage, 10),
    }
    if (data.departure_date) payload.departure_date = data.departure_date
    if (data.estimated_arrival_date) payload.estimated_arrival_date = data.estimated_arrival_date
    if (data.price_per_unit && parseFloat(data.price_per_unit) > 0) payload.price_per_unit = parseFloat(data.price_per_unit)
    if (data.itinerary.trim()) payload.itinerary = data.itinerary.trim()
    if (data.container.trim()) payload.container = data.container.trim()

    await travelsApi.create(payload)
    showSheet.value = false
    await fetchTravels()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    formError.value = e.response?.data?.message ?? 'Erreur lors de la création du voyage.'
  } finally {
    formLoading.value = false
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
        <RefreshButton :loading="loading" @click="fetchTravels" />
      </div>

      <!-- Manager : filter chips par statut -->
      <div v-if="isManager" class="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
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

      <!-- Client : deux onglets -->
      <div v-if="isClient" class="flex gap-1 p-1 rounded-[14px] bg-[var(--glass-bg)] border border-[var(--glass-border)]">
        <button
          class="flex-1 py-2 rounded-[10px] text-sm font-semibold transition-colors cursor-pointer border-none"
          :class="clientTab === 'available'
            ? 'bg-[var(--primary)] text-white shadow-sm'
            : 'bg-transparent text-app-muted'"
          @click="clientTab = 'available'"
        >
          Disponibles
        </button>
        <button
          class="flex-1 py-2 rounded-[10px] text-sm font-semibold transition-colors cursor-pointer border-none"
          :class="clientTab === 'mine'
            ? 'bg-[var(--primary)] text-white shadow-sm'
            : 'bg-transparent text-app-muted'"
          @click="clientTab = 'mine'"
        >
          Mes voyages
          <span
            v-if="myTravelIds.size > 0"
            class="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
            :class="clientTab === 'mine' ? 'bg-white/30 text-white' : 'bg-[var(--primary-20)] text-[var(--primary)]'"
          >{{ myTravelIds.size }}</span>
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
      <EmptyState v-else-if="error" title="Erreur de chargement" :message="error">
        <template #icon><AlertCircle :size="40" /></template>
        <AppButton variant="outline" class="mt-1" @click="fetchTravels">Réessayer</AppButton>
      </EmptyState>

      <!-- Empty -->
      <EmptyState
        v-else-if="filtered.length === 0"
        title="Aucun voyage"
        :message="isManager
          ? (activeFilter === 'all' ? 'Aucun voyage disponible pour le moment.' : 'Aucun voyage avec ce statut.')
          : clientTab === 'available'
            ? 'Aucun voyage ouvert pour le moment. Revenez bientôt !'
            : 'Vous n\'avez encore soumis de colis à aucun voyage.'"
      >
        <template #icon><Ship :size="40" /></template>
      </EmptyState>

      <!-- List -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <TravelCard
          v-for="travel in filtered"
          :key="travel.travel_id"
          :travel="travel"
        />
      </div>

      <!-- Voir plus (manager uniquement) -->
      <div v-if="isManager && (hasMore || loadingMore) && !loading" class="flex justify-center pb-2">
        <AppButton variant="outline" :loading="loadingMore" loading-text="Chargement..." @click="fetchTravels(false)">
          Voir plus
        </AppButton>
      </div>
    </div>

    <!-- FAB -->
    <FloatingActionButton v-if="isManager" aria-label="Nouveau voyage" @click="showSheet = true" />

    <!-- Creation sheet -->
    <TravelFormSheet
      v-model="showSheet"
      title="Nouveau voyage"
      submit-label="Créer le voyage"
      loading-text="Création..."
      :loading="formLoading"
      :error="formError"
      :min-departure-date="todayStr"
      @submit="handleCreate"
    />
  </AppLayout>
</template>
