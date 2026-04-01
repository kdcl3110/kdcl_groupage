<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import LoadBar from '@/components/common/LoadBar.vue'
import { travelsApi } from '@/api/travels'
import { packagesApi } from '@/api/packages'
import { useAuthStore } from '@/stores/auth'
import { useToastStore, apiError } from '@/stores/toast'
import type { Travel, Package } from '@/types'



const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const isManager = computed(() => auth.user?.role === 'freight_forwarder' || auth.user?.role === 'admin')
const isClient  = computed(() => auth.user?.role === 'client')
const toast = useToastStore()

const travel = ref<Travel | null>(null)
const packages = ref<Package[]>([])
const loading = ref(true)
const error = ref('')

const travelId = computed(() => Number(route.params.id))

// ─── Status management ───────────────────────────────────────────────────────
const statusLoading = ref(false)
const statusError = ref('')
const confirmCancelDialog = ref(false)

const travelActions = computed(() => {
  if (!travel.value) return []
  const s = travel.value.status
  if (s === 'open' || s === 'full') {
    return [
      { label: 'Marquer en transit', target: 'in_transit', primary: true },
      { label: 'Annuler', target: 'cancelled', primary: false },
    ]
  }
  if (s === 'in_transit') {
    return [
      { label: 'Marquer livré', target: 'delivered', primary: true },
      { label: 'Annuler', target: 'cancelled', primary: false },
    ]
  }
  return []
})

async function updateTravelStatus(newStatus: string) {
  if (!travel.value) return
  statusError.value = ''
  statusLoading.value = true
  try {
    const { data } = await travelsApi.updateStatus(travel.value.travel_id, newStatus)
    travel.value = data as Travel
    toast.success('Statut du voyage mis à jour.')
  } catch (err: unknown) {
    const msg = apiError(err, 'Erreur lors de la mise à jour du statut.')
    statusError.value = msg
    toast.error(msg)
  } finally {
    statusLoading.value = false
  }
}

function handleActionClick(target: string) {
  if (target === 'cancelled') {
    confirmCancelDialog.value = true
  } else {
    updateTravelStatus(target)
  }
}

async function confirmCancel() {
  confirmCancelDialog.value = false
  await updateTravelStatus('cancelled')
}

// ─── Package status management ───────────────────────────────────────────────
const pkgStatusLoading = ref<Record<number, boolean>>({})
const pkgStatusError = ref<Record<number, string>>({})

function packageActions(pkg: Package) {
  if (!isManager.value) return []
  const s = pkg.status
  if (s === 'submitted') {
    return [{ label: 'Valider', target: 'validate' }]
  }
  if (s === 'in_travel') {
    return [{ label: 'Marquer en transit', target: 'in_transit' }]
  }
  if (s === 'in_transit') {
    return [
      { label: 'Marquer livré', target: 'delivered' },
      { label: 'Retourner', target: 'returned' },
    ]
  }
  return []
}

async function updatePackageStatus(pkg: Package, target: string) {
  pkgStatusError.value[pkg.package_id] = ''
  pkgStatusLoading.value[pkg.package_id] = true
  try {
    const idx = packages.value.findIndex((p) => p.package_id === pkg.package_id)
    if (target === 'validate') {
      const { data } = await packagesApi.validate(pkg.package_id)
      if (idx !== -1) packages.value[idx] = data.package
      const { data: t } = await travelsApi.getById(travelId.value)
      travel.value = t
      toast.success('Colis validé et intégré au voyage.')
    } else {
      const { data } = await packagesApi.update(pkg.package_id, { status: target })
      if (idx !== -1) packages.value[idx] = data
      toast.success('Statut du colis mis à jour.')
    }
  } catch (err: unknown) {
    const msg = apiError(err, 'Erreur lors de la mise à jour.')
    pkgStatusError.value[pkg.package_id] = msg
    toast.error(msg)
  } finally {
    pkgStatusLoading.value[pkg.package_id] = false
  }
}

// ─── Client: submit pending package to this voyage ───────────────────────────
const showSubmitSheet  = ref(false)
const pendingPackages  = ref<Package[]>([])
const pkgsLoading      = ref(false)
const submitToLoading  = ref<number | null>(null)

const canClientSubmit = computed(() =>
  isClient.value &&
  travel.value &&
  (travel.value.status === 'open' || travel.value.status === 'full'),
)

async function openSubmitSheet() {
  showSubmitSheet.value = true
  pkgsLoading.value = true
  try {
    const { data } = await packagesApi.getAll()
    pendingPackages.value = data.filter((p) => p.status === 'pending')
  } catch {
    pendingPackages.value = []
  } finally {
    pkgsLoading.value = false
  }
}

async function submitPackageToTravel(pkg: Package) {
  submitToLoading.value = pkg.package_id
  try {
    const { data: updatedPkg } = await packagesApi.submit(pkg.package_id, travelId.value)
    // Add it to the package list (now with submitted status)
    packages.value.unshift(updatedPkg)
    pendingPackages.value = pendingPackages.value.filter((p) => p.package_id !== pkg.package_id)
    if (pendingPackages.value.length === 0) showSubmitSheet.value = false
  } catch (err: unknown) {
    toast.error(apiError(err, 'Impossible de soumettre le colis.'))
  } finally {
    submitToLoading.value = null
  }
}

// ─── Data ────────────────────────────────────────────────────────────────────
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
    packages.value = pkgsRes.data.filter((p) => p.travel_id === travelId.value)
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
        <p class="font-semibold text-app-primary">Erreur</p>
        <p class="text-sm">{{ error }}</p>
        <button
          class="mt-3 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-[var(--primary)] border-[1.5px] border-[var(--primary)] bg-transparent transition-colors hover:bg-[var(--primary-10)] cursor-pointer"
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
            <div class="flex items-center gap-2 shrink-0">
              <StatusBadge :status="travel.status" />
            </div>
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
          <LoadBar
            v-if="travel.transport_type === 'ship'"
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
          <div class="text-[13px] text-app-muted pt-2 border-t border-[var(--glass-border)]">
            <template v-if="travel.transport_type === 'ship'">
              Restant : <strong class="text-app-primary">{{ travel.remaining_volume.toFixed(2) }} m³</strong>
            </template>
            <template v-else>
              Restant : <strong class="text-app-primary">{{ travel.remaining_weight.toFixed(1) }} kg</strong>
            </template>
          </div>
        </div>

        <!-- Forum button -->
        <button
          class="btn-primary w-full"
          @click="router.push(`/forum/${travel.travel_id}`)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Voir le forum
        </button>

        <!-- Client: submit a package -->
        <button
          v-if="canClientSubmit"
          class="w-full flex items-center justify-center gap-2 py-[14px] rounded-[20px] bg-[var(--primary-10)] border-[1.5px] border-[var(--primary-25)] text-[var(--primary)] text-[15px] font-semibold cursor-pointer transition-colors active:bg-[var(--primary-20)]"
          @click="openSubmitSheet"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Soumettre un colis
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
                <span class="text-[13px] font-bold text-[var(--primary)] font-mono tracking-[0.05em]">{{ pkg.tracking_number }}</span>
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

              <!-- Package actions for manager -->
              <template v-if="isManager && packageActions(pkg).length > 0">
                <div class="border-t border-[var(--glass-border)] mt-1 pt-2 flex items-center gap-2 flex-wrap">
                  <button
                    v-for="action in packageActions(pkg)"
                    :key="action.target"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border-[1.5px] border-[var(--primary)] text-[var(--primary)] bg-[var(--primary-10)] cursor-pointer transition-all hover:bg-[var(--primary-15)] active:scale-[0.96]"
                    :disabled="pkgStatusLoading[pkg.package_id]"
                    @click="updatePackageStatus(pkg, action.target as string)"
                  >
                    <svg
                      v-if="pkgStatusLoading[pkg.package_id]"
                      class="animate-spin"
                      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    {{ action.label }}
                  </button>
                  <p v-if="pkgStatusError[pkg.package_id]" class="text-[11px] text-red-400 w-full">
                    {{ pkgStatusError[pkg.package_id] }}
                  </p>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- Travel status management -->
        <template v-if="isManager && travelActions.length > 0">
          <div class="glass rounded-[20px] p-5 flex flex-col gap-4">
            <h3 class="text-base font-bold text-app-primary">Gestion du statut</h3>

            <div v-if="statusError" class="flex items-center gap-2 px-3.5 py-2.5 bg-red-500/10 border border-red-500/25 rounded-[10px] text-[13px] text-red-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {{ statusError }}
            </div>

            <div class="flex flex-col gap-2.5">
              <template v-for="action in travelActions" :key="action.target">
                <button
                  v-if="action.primary"
                  class="btn-primary w-full flex items-center justify-center gap-2"
                  :disabled="statusLoading"
                  @click="handleActionClick(action.target)"
                >
                  <svg
                    v-if="statusLoading"
                    class="animate-spin"
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  {{ action.label }}
                </button>
                <button
                  v-else
                  class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[12px] text-sm font-semibold cursor-pointer transition-all bg-[rgba(239,68,68,0.1)] border-[1.5px] border-[rgba(239,68,68,0.25)] text-red-400 hover:bg-[rgba(239,68,68,0.15)] active:scale-[0.98]"
                  :disabled="statusLoading"
                  @click="handleActionClick(action.target)"
                >
                  {{ action.label }}
                </button>
              </template>
            </div>
          </div>
        </template>
      </template>
    </div>

    <!-- Cancel confirmation dialog -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="confirmCancelDialog" class="overlay flex items-center justify-center px-4" @click.self="confirmCancelDialog = false">
          <div class="sheet w-full max-w-[360px] rounded-[20px] p-6 flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <h3 class="text-[16px] font-extrabold text-app-primary">Annuler le voyage</h3>
              <p class="text-sm text-app-muted">Cette action est irréversible. Le voyage sera marqué comme annulé.</p>
            </div>
            <div class="flex gap-2.5">
              <button
                class="flex-1 px-4 py-2.5 rounded-[12px] text-sm font-semibold text-app-muted glass cursor-pointer border-none transition-all hover:text-app-primary active:scale-[0.97]"
                @click="confirmCancelDialog = false"
              >
                Retour
              </button>
              <button
                class="flex-1 px-4 py-2.5 rounded-[12px] text-sm font-semibold cursor-pointer transition-all bg-[rgba(239,68,68,0.1)] border-[1.5px] border-[rgba(239,68,68,0.25)] text-red-400 hover:bg-[rgba(239,68,68,0.15)] active:scale-[0.97]"
                @click="confirmCancel"
              >
                Confirmer l'annulation
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Client: submit package sheet -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showSubmitSheet" class="overlay flex items-end justify-center" @click.self="showSubmitSheet = false">
          <Transition name="slide-up">
            <div v-if="showSubmitSheet" class="sheet w-full max-w-[560px] rounded-t-[24px] p-5 flex flex-col gap-4">
              <div class="flex items-center justify-between">
                <h3 class="text-[16px] font-extrabold text-app-primary">Soumettre un colis</h3>
                <button class="w-8 h-8 rounded-full glass flex items-center justify-center cursor-pointer border-none text-app-muted transition-colors hover:text-app-primary" @click="showSubmitSheet = false">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <div v-if="pkgsLoading" class="flex flex-col gap-2.5">
                <div v-for="i in 3" :key="i" class="skeleton h-[76px] rounded-[14px]" />
              </div>

              <div v-else-if="pendingPackages.length === 0" class="py-8 text-center text-sm text-app-muted">
                Aucun colis en attente à soumettre.
              </div>

              <div v-else class="flex flex-col gap-2.5 overflow-y-auto max-h-[50dvh] scrollbar-hide">
                <div
                  v-for="pkg in pendingPackages"
                  :key="pkg.package_id"
                  class="glass-subtle rounded-[14px] p-3.5 flex items-center justify-between gap-3"
                >
                  <div class="flex-1 min-w-0">
                    <p class="text-[13px] font-bold text-[var(--primary)] font-mono tracking-[0.05em] truncate">{{ pkg.tracking_number }}</p>
                    <p class="text-[13px] text-app-muted truncate mt-0.5">{{ pkg.description }}</p>
                    <div class="flex items-center gap-1.5 text-[11px] text-app-faint mt-0.5">
                      <span>{{ pkg.weight }} kg</span><span>·</span><span>{{ pkg.volume }} m³</span>
                    </div>
                  </div>
                  <button
                    class="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold text-[var(--primary)] bg-[var(--primary-10)] border border-[var(--primary-25)] cursor-pointer transition-colors active:bg-[var(--primary-20)] disabled:opacity-40"
                    :disabled="submitToLoading === pkg.package_id"
                    @click="submitPackageToTravel(pkg)"
                  >
                    <svg v-if="submitToLoading === pkg.package_id" class="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Soumettre
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </AppLayout>
</template>
