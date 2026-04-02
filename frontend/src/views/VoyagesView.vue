<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import TravelCard from '@/components/travel/TravelCard.vue'
import SearchableSelect from '@/components/common/SearchableSelect.vue'
import ModalSheet from '@/components/common/ModalSheet.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import AppButton from '@/components/common/AppButton.vue'
import RefreshButton from '@/components/common/RefreshButton.vue'
import FloatingActionButton from '@/components/common/FloatingActionButton.vue'
import { travelsApi } from '@/api/travels'
import { packagesApi } from '@/api/packages'
import { countriesApi } from '@/api/countries'
import { useAuthStore } from '@/stores/auth'
import type { Travel, Package, Country } from '@/types'

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
  { key: 'all',       label: 'Tous' },
  { key: 'open',      label: 'Ouvert' },
  { key: 'full',      label: 'Complet' },
  { key: 'in_transit',label: 'En transit' },
  { key: 'delivered', label: 'Livré' },
  { key: 'cancelled', label: 'Annulé' },
]

// Client filters (by participation) 
const clientFilter = ref('all')
const clientFilters = [
  { key: 'all',       label: 'Tous' },
  { key: 'my',        label: 'Mes voyages' },
  { key: 'pending',   label: 'En attente' },
  { key: 'active',    label: 'En cours' },
  { key: 'delivered', label: 'Livrés' },
]
const myPackages = ref<Package[]>([])

const myTravelIds = computed(() => {
  const all       = new Set<number>()
  const pending   = new Set<number>()
  const active    = new Set<number>()
  const delivered = new Set<number>()
  for (const pkg of myPackages.value) {
    if (!pkg.travel_id) continue
    all.add(pkg.travel_id)
    if (pkg.status === 'submitted') pending.add(pkg.travel_id)
    if (pkg.status === 'in_travel' || pkg.status === 'in_transit') active.add(pkg.travel_id)
    if (pkg.status === 'delivered') delivered.add(pkg.travel_id)
  }
  return { all, pending, active, delivered }
})

const filtered = computed(() => {
  if (isManager.value) {
    // Le filtre de statut est géré côté serveur
    return travels.value
  }
  // client — filtre client-side sur les voyages chargés
  const ids = myTravelIds.value
  if (clientFilter.value === 'all')       return travels.value
  if (clientFilter.value === 'my')        return travels.value.filter(t => ids.all.has(t.travel_id))
  if (clientFilter.value === 'pending')   return travels.value.filter(t => ids.pending.has(t.travel_id))
  if (clientFilter.value === 'active')    return travels.value.filter(t => ids.active.has(t.travel_id))
  if (clientFilter.value === 'delivered') return travels.value.filter(t => ids.delivered.has(t.travel_id))
  return travels.value
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
    const params: Record<string, string> = {
      limit: String(PAGE_SIZE),
      offset: String(offset.value),
    }
    // Pour le manager, on passe le filtre de statut côté serveur
    if (isManager.value && activeFilter.value !== 'all') {
      params.status = activeFilter.value
    }

    const travRes = await travelsApi.getAll(params)
    const { data: newTravels, hasMore: more } = travRes.data
    travels.value = reset ? newTravels : [...travels.value, ...newTravels]
    hasMore.value = more
    offset.value += newTravels.length

    if (isClient.value) {
      const pkgRes = await packagesApi.getAll({ limit: '1000' })
      myPackages.value = pkgRes.data.data
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

//  Countries 
const countries = ref<Country[]>([])
async function fetchCountries() {
  try {
    const { data } = await countriesApi.getAll()
    countries.value = data.filter(c => c.is_active)
  } catch {
    // non-blocking
  }
}

// Creation sheet 
const showSheet = ref(false)
const formLoading = ref(false)
const formError = ref('')
const showAdvanced = ref(false)
const todayStr = new Date().toISOString().split('T')[0]

const form = reactive({
  transport_type: 'ship' as 'ship' | 'plane',
  origin_country_id: '',
  destination_country_id: '',
  departure_date: '',
  estimated_arrival_date: '',
  max_weight: '',
  max_volume: '',
  itinerary: '',
  container: '',
  min_load_percentage: '0',
  max_load_percentage: '100',
})

function openSheet() {
  resetForm()
  fetchCountries()
  showSheet.value = true
}

function resetForm() {
  form.transport_type = 'ship'
  form.origin_country_id = ''
  form.destination_country_id = ''
  form.departure_date = ''
  form.estimated_arrival_date = ''
  form.max_weight = ''
  form.max_volume = ''
  form.itinerary = ''
  form.container = ''
  form.min_load_percentage = '0'
  form.max_load_percentage = '100'
  formError.value = ''
  formLoading.value = false
  showAdvanced.value = false
}

async function handleCreate() {
  formError.value = ''
  if (!form.origin_country_id || !form.destination_country_id) {
    formError.value = 'Les pays d\'origine et de destination sont obligatoires.'
    return
  }
  if (form.origin_country_id === form.destination_country_id) {
    formError.value = 'Le pays d\'origine et le pays de destination doivent être différents.'
    return
  }
  if (form.departure_date) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (new Date(form.departure_date) < today) {
      formError.value = 'La date de départ ne peut pas être antérieure à aujourd\'hui.'
      return
    }
  }
  if (form.departure_date && form.estimated_arrival_date) {
    if (new Date(form.estimated_arrival_date) <= new Date(form.departure_date)) {
      formError.value = 'La date d\'arrivée estimée doit être postérieure à la date de départ.'
      return
    }
  }
  if (!form.max_weight || parseFloat(form.max_weight) <= 0) {
    formError.value = 'Le poids maximum doit être supérieur à 0.'
    return
  }
  if (!form.max_volume || parseFloat(form.max_volume) <= 0) {
    formError.value = 'Le volume maximum doit être supérieur à 0.'
    return
  }

  formLoading.value = true
  try {
    const payload: Record<string, unknown> = {
      transport_type: form.transport_type,
      origin_country_id: parseInt(form.origin_country_id),
      destination_country_id: parseInt(form.destination_country_id),
      max_weight: parseFloat(form.max_weight),
      max_volume: parseFloat(form.max_volume),
      min_load_percentage: parseInt(form.min_load_percentage, 10),
      max_load_percentage: parseInt(form.max_load_percentage, 10),
    }
    if (form.departure_date) payload.departure_date = form.departure_date
    if (form.estimated_arrival_date) payload.estimated_arrival_date = form.estimated_arrival_date
    if (form.itinerary.trim()) payload.itinerary = form.itinerary.trim()
    if (form.container.trim()) payload.container = form.container.trim()

    await travelsApi.create(payload)
    showSheet.value = false
    resetForm()
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

      <!-- Filter chips — manager: by status / client: by participation -->
      <div class="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
        <template v-if="isManager">
          <button
            v-for="f in filters"
            :key="f.key"
            class="chip"
            :class="{ active: activeFilter === f.key }"
            @click="activeFilter = f.key"
          >
            {{ f.label }}
          </button>
        </template>
        <template v-else>
          <button
            v-for="f in clientFilters"
            :key="f.key"
            class="chip"
            :class="{ active: clientFilter === f.key }"
            @click="clientFilter = f.key"
          >
            {{ f.label }}
          </button>
        </template>
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
      <EmptyState v-else-if="error" icon="⚠️" title="Erreur de chargement" :message="error">
        <AppButton variant="outline" class="mt-1" @click="fetchTravels">Réessayer</AppButton>
      </EmptyState>

      <!-- Empty -->
      <EmptyState
        v-else-if="filtered.length === 0"
        title="Aucun voyage"
        :message="isManager
          ? (activeFilter === 'all' ? 'Aucun voyage disponible pour le moment.' : 'Aucun voyage avec ce statut.')
          : (clientFilter === 'all' ? 'Aucun voyage disponible pour le moment.' : 'Aucun voyage correspondant à ce filtre.')"
      />

      <!-- List -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <TravelCard
          v-for="travel in filtered"
          :key="travel.travel_id"
          :travel="travel"
        />
      </div>

      <!-- Voir plus -->
      <div v-if="(hasMore || loadingMore) && !loading" class="flex justify-center pb-2">
        <AppButton variant="outline" :loading="loadingMore" loading-text="Chargement..." @click="fetchTravels(false)">
          Voir plus
        </AppButton>
      </div>
    </div>

    <!-- FAB -->
    <FloatingActionButton v-if="isManager" aria-label="Nouveau voyage" @click="openSheet" />

    <!-- Creation sheet -->
    <ModalSheet v-model="showSheet" title="Nouveau voyage">

      <div class="px-5 py-5 flex flex-col gap-5">

                <!-- Transport type -->
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Type de transport</label>
                  <div class="flex gap-2">
                    <button
                      class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] border-[1.5px] text-sm font-semibold transition-all cursor-pointer"
                      :class="form.transport_type === 'ship'
                        ? 'bg-[var(--primary-10)] border-[var(--primary)] text-[var(--primary)]'
                        : 'bg-transparent border-[var(--glass-border)] text-app-muted'"
                      @click="form.transport_type = 'ship'"
                      type="button"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M2 21c.6.5 1.2 1 2.5 1C7 22 7 20 9.5 20c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
                        <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/>
                        <path d="M19 13V7l-7-3-7 3v6"/>
                        <line x1="12" y1="10" x2="12" y2="4"/>
                      </svg>
                      Maritime
                    </button>
                    <button
                      class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] border-[1.5px] text-sm font-semibold transition-all cursor-pointer"
                      :class="form.transport_type === 'plane'
                        ? 'bg-[var(--primary-10)] border-[var(--primary)] text-[var(--primary)]'
                        : 'bg-transparent border-[var(--glass-border)] text-app-muted'"
                      @click="form.transport_type = 'plane'"
                      type="button"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2c-.5.1-.9.5-.9 1 0 .3.1.6.3.8l1.6 1.7 2.9-.7 1.2 1.3-3.5 3.5L5 18l3.5-.5L12 21l1.7 1.6c.2.2.5.3.8.3.5 0 .9-.4 1-.9z"/>
                      </svg>
                      Aérien
                    </button>
                  </div>
                </div>

                <!-- Origin / Destination -->
                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-2">
                    <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Origine</label>
                    <SearchableSelect
                      v-model="form.origin_country_id"
                      :options="countries.map(c => ({ value: String(c.country_id), label: c.name }))"
                      placeholder="Rechercher…"
                    />
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Destination</label>
                    <SearchableSelect
                      v-model="form.destination_country_id"
                      :options="countries.map(c => ({ value: String(c.country_id), label: c.name }))"
                      placeholder="Rechercher…"
                    />
                  </div>
                </div>

                <!-- Dates -->
                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-2">
                    <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Départ</label>
                    <input
                      v-model="form.departure_date"
                      type="date"
                      class="input-field"
                      :min="todayStr"
                    />
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Arrivée estimée</label>
                    <input
                      v-model="form.estimated_arrival_date"
                      type="date"
                      class="input-field"
                      :min="form.departure_date || todayStr"
                    />
                  </div>
                </div>

                <!-- Capacity -->
                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-2">
                    <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Poids max (kg)</label>
                    <input
                      v-model="form.max_weight"
                      type="number"
                      min="0"
                      step="0.1"
                      class="input-field"
                      placeholder="Ex: 5000"
                    />
                  </div>
                  <div class="flex flex-col gap-2">
                    <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Volume max (m³)</label>
                    <input
                      v-model="form.max_volume"
                      type="number"
                      min="0"
                      step="0.01"
                      class="input-field"
                      placeholder="Ex: 20"
                    />
                  </div>
                </div>

                <!-- Itinerary -->
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Itinéraire</label>
                  <input
                    v-model="form.itinerary"
                    type="text"
                    class="input-field"
                    placeholder="Ex: Paris → Dakar via Las Palmas"
                  />
                </div>

                <!-- Container -->
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Conteneur</label>
                  <input
                    v-model="form.container"
                    type="text"
                    class="input-field"
                    placeholder="Ex: MSCU1234567"
                  />
                </div>

                <!-- Advanced settings -->
                <div class="flex flex-col gap-3">
                  <button
                    type="button"
                    class="flex items-center gap-2 text-sm font-semibold text-app-muted cursor-pointer bg-transparent border-none p-0 w-fit transition-colors hover:text-app-primary"
                    @click="showAdvanced = !showAdvanced"
                  >
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                      :style="showAdvanced ? 'transform: rotate(90deg)' : ''"
                      style="transition: transform 0.2s;"
                    >
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                    Paramètres avancés
                  </button>

                  <div v-if="showAdvanced" class="flex flex-col gap-3 pl-2 border-l-2 border-[var(--glass-border)]">
                    <div class="grid grid-cols-2 gap-3">
                      <div class="flex flex-col gap-2">
                        <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Charge min (%)</label>
                        <input
                          v-model="form.min_load_percentage"
                          type="number"
                          min="0"
                          max="100"
                          class="input-field"
                          placeholder="0"
                        />
                      </div>
                      <div class="flex flex-col gap-2">
                        <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Charge max (%)</label>
                        <input
                          v-model="form.max_load_percentage"
                          type="number"
                          min="0"
                          max="100"
                          class="input-field"
                          placeholder="100"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <ErrorAlert :message="formError" />
      </div>

      <template #footer>
        <AppButton :loading="formLoading" :full="true" loading-text="Création..." @click="handleCreate">
          Créer le voyage
        </AppButton>
      </template>
    </ModalSheet>
  </AppLayout>
</template>
