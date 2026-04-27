<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import AppButton from '@/components/common/AppButton.vue'
import RefreshButton from '@/components/common/RefreshButton.vue'
import FloatingActionButton from '@/components/common/FloatingActionButton.vue'
import PackageFormSheet from '@/components/package/PackageFormSheet.vue'
import type { PackageFormPayload } from '@/components/package/PackageFormSheet.vue'
import { AlertCircle, Package as PackageIcon } from 'lucide-vue-next'
import { packagesApi } from '@/api/packages'
import { useToastStore, apiError } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'
import { useCurrencyStore } from '@/stores/currency'
import type { Package } from '@/types'

const router = useRouter()
const auth = useAuthStore()
const currencyStore = useCurrencyStore()
const isClient = computed(() => auth.user?.role === 'client')

// List state
const packages = ref<Package[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(false)
const offset = ref(0)
const PAGE_SIZE = 10
const error = ref('')

// Status filters (client only)
const activeFilter = ref('all')
const colisFilters = [
  { key: 'all',        label: 'Tous' },
  { key: 'pending',    label: 'En attente' },
  { key: 'submitted',  label: 'Soumis' },
  { key: 'in_travel',  label: 'En voyage' },
  { key: 'in_transit', label: 'En transit' },
  { key: 'delivered',  label: 'Livré' },
  { key: 'cancelled',  label: 'Annulé' },
]
const filtered = computed(() => {
  if (!isClient.value || activeFilter.value === 'all') return packages.value
  return packages.value.filter(p => p.status === activeFilter.value)
})

// Sheet state
const showSheet = ref(false)
const formLoading = ref(false)
const formError = ref('')
const toast = useToastStore()

// Data fetch
async function fetchPackages(reset = true) {
  if (reset) {
    offset.value = 0
    packages.value = []
    loading.value = true
  } else {
    loadingMore.value = true
  }
  error.value = ''
  try {
    const { data: result } = await packagesApi.getAll({
      limit: String(PAGE_SIZE),
      offset: String(offset.value),
    })
    packages.value = reset ? result.data : [...packages.value, ...result.data]
    hasMore.value = result.hasMore
    offset.value += result.data.length
  } catch {
    error.value = 'Impossible de charger les colis.'
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

async function handleCreate(payload: PackageFormPayload) {
  formError.value = ''
  formLoading.value = true
  try {
    const fd = new FormData()
    fd.append('description', payload.description)
    fd.append('weight', payload.weight)
    fd.append('volume', payload.volume)
    fd.append('declared_value', payload.declared_value)
    fd.append('fragility', payload.fragility)
    if (payload.special_instructions) fd.append('special_instructions', payload.special_instructions)
    fd.append('recipient_id', String(payload.recipient_id))
    if (payload.travel_id) fd.append('travel_id', String(payload.travel_id))
    payload.imgFiles.forEach((file, i) => {
      if (file) fd.append(`image${i + 1}`, file)
    })
    await packagesApi.create(fd)
    showSheet.value = false
    await fetchPackages()
    toast.success('Colis créé avec succès.')
  } catch (err: unknown) {
    const msg = apiError(err, 'Erreur lors de la création du colis.')
    formError.value = msg
    toast.error(msg)
  } finally {
    formLoading.value = false
  }
}

// Helpers
const STATUS_COLORS: Record<string, string> = {
  pending:    '#9ca3af',
  in_travel:  '#81A6C6',
  in_transit: '#60a5fa',
  delivered:  '#2dd4bf',
  returned:   '#fb923c',
  cancelled:  '#f87171',
}

function statusColor(status: string) {
  return STATUS_COLORS[status] ?? '#9ca3af'
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

onMounted(fetchPackages)
</script>

<template>
  <AppLayout>
    <div class="p-4 sm:p-6 lg:p-8 flex flex-col gap-4">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-extrabold text-app-primary tracking-tight">Colis</h1>
        <RefreshButton :loading="loading" @click="fetchPackages" />
      </div>

      <!-- Filter chips (client only) -->
      <div v-if="isClient" class="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
        <button
          v-for="f in colisFilters"
          :key="f.key"
          class="chip"
          :class="{ active: activeFilter === f.key }"
          @click="activeFilter = f.key"
        >
          {{ f.label }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex flex-col gap-2.5">
        <div v-for="i in 4" :key="i" class="glass rounded-[20px] p-4">
          <div class="skeleton h-4 w-[55%]" />
          <div class="skeleton h-3 w-[35%] mt-1.5" />
        </div>
      </div>

      <!-- Error -->
      <EmptyState v-else-if="error" title="Erreur" :message="error">
        <template #icon><AlertCircle :size="40" /></template>
        <AppButton variant="outline" class="mt-1" @click="fetchPackages">Réessayer</AppButton>
      </EmptyState>

      <!-- Empty -->
      <EmptyState
        v-else-if="filtered.length === 0"
        title="Aucun colis"
        :message="activeFilter === 'all' ? 'Ajoutez votre premier colis en cliquant sur le bouton +.' : 'Aucun colis avec ce statut pour le moment.'"
      >
        <template #icon><PackageIcon :size="40" /></template>
      </EmptyState>

      <!-- List -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <div
          v-for="pkg in filtered"
          :key="pkg.package_id"
          class="glass rounded-[20px] overflow-hidden cursor-pointer transition-transform duration-150 active:scale-[0.985] border-t-[3px]"
          :style="`border-top-color: ${statusColor(pkg.status)};`"
          @click="router.push('/colis/' + pkg.package_id)"
        >
          <!-- Hero image -->
          <div class="relative h-[180px]">
            <img
              v-if="pkg.image1"
              :src="pkg.image1"
              :alt="pkg.description"
              class="absolute inset-0 w-full h-full object-cover"
            />
            <!-- No image placeholder -->
            <div
              v-else
              class="h-[180px] flex items-center justify-center"
              :style="`background-color: color-mix(in srgb, ${statusColor(pkg.status)} 8%, transparent);`"
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-white/15">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <!-- Gradient overlay -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <!-- Overlay content -->
            <div class="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3.5 pb-3">
              <span class="font-mono text-[11px] text-white/60 tracking-[0.08em]">{{ pkg.tracking_number }}</span>
              
            </div>
          </div>

          <!-- Card body -->
          <div class="p-4 flex flex-col gap-2.5 relative">
            <div class="absolute top-2 right-2">

              <StatusBadge :status="pkg.status" />
            </div>
            <!-- Description -->
            <p class="text-[15px] font-semibold text-app-primary leading-snug">{{ pkg.description }}</p>

            <!-- Metrics row -->
            <p class="text-[13px] text-app-muted flex items-center gap-1.5">
              <span>{{ pkg.weight }} kg</span>
              <span class="text-app-faint">·</span>
              <span>{{ pkg.volume }} m³</span>
              <span class="text-app-faint">·</span>
              <span>{{ currencyStore.formatAmount(pkg.declared_value) }}</span>
            </p>

            <!-- Footer row -->
            <div class="flex items-center justify-between">
              <span class="text-[11px] text-app-faint">{{ formatDate(pkg.creation_date) }}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-app-faint">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Voir plus -->
      <div v-if="(hasMore || loadingMore) && !loading" class="flex justify-center pb-2">
        <AppButton variant="outline" :loading="loadingMore" loading-text="Chargement..." @click="fetchPackages(false)">
          Voir plus
        </AppButton>
      </div>
    </div>

    <FloatingActionButton aria-label="Nouveau colis" @click="showSheet = true" />

    <PackageFormSheet
      v-model="showSheet"
      mode="create"
      :loading="formLoading"
      :error="formError"
      @submit="handleCreate"
    />
  </AppLayout>
</template>
