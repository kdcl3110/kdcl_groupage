<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import LoadBar from '@/components/common/LoadBar.vue'
import { travelsApi } from '@/api/travels'
import { packagesApi } from '@/api/packages'
import type { Travel, Package } from '@/types'

const route = useRoute()
const router = useRouter()

const travel = ref<Travel | null>(null)
const packages = ref<Package[]>([])
const loading = ref(true)
const error = ref('')

const travelId = computed(() => Number(route.params.id))

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

const transportLabel = computed(() => {
  if (!travel.value) return ''
  return travel.value.transport_type === 'ship' ? 'Maritime' : 'Aérien'
})

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const [travelRes, pkgsRes] = await Promise.all([
      travelsApi.getById(travelId.value),
      packagesApi.getAll({ travel_id: String(travelId.value) }),
    ])
    travel.value = travelRes.data
    packages.value = pkgsRes.data
  } catch {
    error.value = 'Impossible de charger les données du voyage.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <AppLayout>
    <div class="p-4 sm:p-6 lg:p-8 flex flex-col gap-4">
      <!-- Back button -->
      <div class="flex items-center">
        <button
          class="flex items-center gap-1.5 text-sm text-app-muted cursor-pointer bg-transparent border-none p-0 transition-colors hover:text-app-primary"
          @click="router.back()"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Retour
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex flex-col gap-2">
        <div class="skeleton h-6 w-1/2 mb-2" />
        <div class="skeleton h-40" />
        <div class="skeleton h-24 mt-4" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="flex flex-col items-center gap-3 py-12 px-6 text-center text-app-muted">
        <span class="text-5xl opacity-40">⚠️</span>
        <p class="font-semibold text-app-primary">Erreur</p>
        <p class="text-sm">{{ error }}</p>
        <button
          class="mt-3 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-[#A813B7] border-[1.5px] border-[#A813B7] bg-transparent transition-colors hover:bg-[rgba(168,19,183,0.1)] cursor-pointer"
          @click="fetchData"
        >
          Réessayer
        </button>
      </div>

      <template v-else-if="travel">
        <!-- Header card -->
        <div class="glass rounded-[20px] p-5 flex flex-col gap-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex items-center gap-2 text-app-muted">
                <span class="text-lg font-bold text-app-primary">{{ travel.origin_country }}</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
                <span class="text-lg font-bold text-app-primary">{{ travel.destination_country }}</span>
              </div>
              <p v-if="travel.itinerary" class="text-[13px] text-app-muted mt-1">{{ travel.itinerary }}</p>
            </div>
            <StatusBadge :status="travel.status" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-0.5">
              <span class="text-[11px] font-medium text-app-muted uppercase tracking-[0.05em]">Transport</span>
              <span class="text-sm font-semibold text-app-primary">{{ transportLabel }}</span>
            </div>
            <div v-if="travel.container" class="flex flex-col gap-0.5">
              <span class="text-[11px] font-medium text-app-muted uppercase tracking-[0.05em]">Conteneur</span>
              <span class="text-sm font-semibold text-app-primary">{{ travel.container }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-[11px] font-medium text-app-muted uppercase tracking-[0.05em]">Départ</span>
              <span class="text-sm font-semibold text-app-primary">{{ formatDate(travel.departure_date) }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-[11px] font-medium text-app-muted uppercase tracking-[0.05em]">Arrivée estimée</span>
              <span class="text-sm font-semibold text-app-primary">{{ formatDate(travel.estimated_arrival_date) }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-[11px] font-medium text-app-muted uppercase tracking-[0.05em]">Créé le</span>
              <span class="text-sm font-semibold text-app-primary">{{ formatDate(travel.creation_date) }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-[11px] font-medium text-app-muted uppercase tracking-[0.05em]">Colis</span>
              <span class="text-sm font-semibold text-app-primary">{{ travel.packages_count }}</span>
            </div>
          </div>
        </div>

        <!-- Capacity card -->
        <div class="glass rounded-[20px] p-5 flex flex-col gap-4">
          <h3 class="text-base font-bold text-app-primary">Capacité</h3>
          <div class="flex flex-col gap-3.5">
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
          <div class="text-[13px] text-app-muted pt-2 border-t border-[var(--glass-border)]">
            Restant : <strong class="text-app-primary">{{ travel.remaining_weight.toFixed(1) }} kg</strong> · <strong class="text-app-primary">{{ travel.remaining_volume.toFixed(2) }} m³</strong>
          </div>
        </div>

        <!-- Forum button -->
        <button
          class="btn-primary w-full"
          @click="router.push(`/forum?travel_id=${travel.travel_id}`)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Voir le forum
        </button>

        <!-- Packages list -->
        <div class="flex flex-col gap-2.5">
          <h3 class="text-base font-bold text-app-primary">Colis associés ({{ packages.length }})</h3>

          <div v-if="packages.length === 0" class="py-6 text-center text-sm text-app-muted">
            Aucun colis pour ce voyage.
          </div>

          <div v-else class="flex flex-col gap-2">
            <div
              v-for="pkg in packages"
              :key="pkg.package_id"
              class="glass-subtle rounded-[14px] p-3.5 flex flex-col gap-1.5"
            >
              <div class="flex items-center justify-between">
                <span class="text-[13px] font-bold text-[#A813B7] font-mono tracking-[0.05em]">{{ pkg.tracking_number }}</span>
                <StatusBadge :status="pkg.status" />
              </div>
              <p class="text-[13px] text-app-muted">{{ pkg.description }}</p>
              <div class="flex items-center gap-1.5 text-xs text-app-faint">
                <span>{{ pkg.weight }} kg</span>
                <span>·</span>
                <span>{{ pkg.volume }} m³</span>
                <span>·</span>
                <span>{{ pkg.declared_value }} €</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </AppLayout>
</template>
