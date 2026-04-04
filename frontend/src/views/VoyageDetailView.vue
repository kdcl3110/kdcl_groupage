<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import LoadBar from '@/components/common/LoadBar.vue'
import ReportSheet from '@/components/common/ReportSheet.vue'
import { travelsApi } from '@/api/travels'
import { packagesApi } from '@/api/packages'
import { useAuthStore } from '@/stores/auth'
import { useToastStore, apiError } from '@/stores/toast'
import type { Travel, Package } from '@/types'
import type { TravelCreator } from '@/types'



const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const isManager = computed(() => auth.user?.role === 'freight_forwarder' || auth.user?.role === 'admin')
const isClient  = computed(() => auth.user?.role === 'client')
const toast = useToastStore()

const travel       = ref<Travel | null>(null)
const packages     = ref<Package[]>([])
const loading      = ref(true)
const error        = ref('')
const showReport   = ref(false)

const submittedPackages  = computed(() => packages.value.filter(p => p.status === 'submitted'))
const otherPackages      = computed(() => packages.value.filter(p => p.status !== 'submitted'))
const inTravelPackages   = computed(() => packages.value.filter(p => p.status === 'in_travel'))

const travelId = computed(() => Number(route.params.id))

// ─── Status management ───────────────────────────────────────────────────────
const statusLoading = ref(false)
const statusError = ref('')

// Dialog annulation simple (pas de colis engagés)
const confirmCancelDialog = ref(false)

// Dialog réassignation (colis in_travel présents)
const showReassignDialog       = ref(false)
const reassignTravels          = ref<Travel[]>([])
const reassignTravelsLoading   = ref(false)
const reassignTargetTravel     = ref<Travel | null>(null)
const reassignLoading          = ref(false)

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
    await travelsApi.updateStatus(travel.value.travel_id, newStatus)
    const [travelRes, pkgsRes] = await Promise.all([
      travelsApi.getById(travelId.value),
      packagesApi.getAll({ travel_id: String(travelId.value), limit: '1000' }),
    ])
    travel.value = travelRes.data
    packages.value = pkgsRes.data.data.filter(p => p.travel_id === travelId.value)
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
    if (inTravelPackages.value.length > 0) {
      openReassignDialog()
    } else {
      confirmCancelDialog.value = true
    }
  } else {
    updateTravelStatus(target)
  }
}

async function confirmCancel() {
  confirmCancelDialog.value = false
  await updateTravelStatus('cancelled')
}

async function openReassignDialog() {
  showReassignDialog.value = true
  reassignTargetTravel.value = null
  reassignTravelsLoading.value = true
  try {
    const { data } = await travelsApi.getAll({ status: 'open', limit: '100' })
    reassignTravels.value = data.data.filter(t => t.travel_id !== travelId.value)
  } catch {
    reassignTravels.value = []
  } finally {
    reassignTravelsLoading.value = false
  }
}

async function confirmCancelWithReassign() {
  if (!reassignTargetTravel.value) return
  reassignLoading.value = true
  try {
    const { data } = await travelsApi.updateStatus(travelId.value, 'cancelled', reassignTargetTravel.value.travel_id)
    travel.value = data as Travel
    showReassignDialog.value = false
    toast.success(`Voyage annulé. Les ${inTravelPackages.value.length} colis ont été transférés.`)
    // Recharge les colis pour refléter la réassignation
    const pkgsRes = await packagesApi.getAll({ travel_id: String(travelId.value), limit: '1000' })
    packages.value = pkgsRes.data.data.filter(p => p.travel_id === travelId.value)
  } catch (err) {
    toast.error(apiError(err, 'Erreur lors de l\'annulation du voyage.'))
  } finally {
    reassignLoading.value = false
  }
}

// ─── Move package to another travel ──────────────────────────────────────────
const showMoveSheet      = ref(false)
const movingPkg          = ref<Package | null>(null)
const moveTravels        = ref<Travel[]>([])
const moveTravelsLoading = ref(false)
const moveTarget         = ref<Travel | null>(null)
const moveLoading        = ref(false)

async function openMoveSheet(pkg: Package) {
  movingPkg.value = pkg
  moveTarget.value = null
  showMoveSheet.value = true
  moveTravelsLoading.value = true
  try {
    const { data } = await travelsApi.getAll({ status: 'open', limit: '100' })
    moveTravels.value = data.data.filter(t => t.travel_id !== travelId.value)
  } catch {
    moveTravels.value = []
  } finally {
    moveTravelsLoading.value = false
  }
}

async function confirmMove() {
  if (!movingPkg.value || !moveTarget.value) return
  moveLoading.value = true
  try {
    await packagesApi.reassign(movingPkg.value.package_id, moveTarget.value.travel_id)
    packages.value = packages.value.filter(p => p.package_id !== movingPkg.value!.package_id)
    const { data: t } = await travelsApi.getById(travelId.value)
    travel.value = t
    showMoveSheet.value = false
    toast.success(`Colis déplacé vers le voyage #${moveTarget.value.travel_id}.`)
  } catch (err) {
    toast.error(apiError(err, 'Impossible de déplacer le colis.'))
  } finally {
    moveLoading.value = false
  }
}

// ─── Package status management ───────────────────────────────────────────────
const pkgStatusLoading = ref<Record<number, boolean>>({})
const pkgStatusError = ref<Record<number, string>>({})

function packageActions(pkg: Package) {
  if (!isManager.value) return []
  const s = pkg.status
  if (s === 'submitted') {
    return [
      { label: 'Accepter', target: 'validate', danger: false },
      { label: 'Rejeter',  target: 'reject',   danger: true  },
    ]
  }
  if (s === 'in_travel') {
    return [{ label: 'Marquer en transit', target: 'in_transit', danger: false }]
  }
  if (s === 'in_transit') {
    return [
      { label: 'Marquer livré', target: 'delivered', danger: false },
      { label: 'Retourner',     target: 'returned',  danger: true  },
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
      toast.success('Colis accepté et intégré au voyage.')
    } else if (target === 'reject') {
      await packagesApi.reject(pkg.package_id)
      packages.value = packages.value.filter(p => p.package_id !== pkg.package_id)
      toast.success('Colis rejeté. Le client a été notifié.')
    } else {
      const { data } = await packagesApi.updateStatus(pkg.package_id, target)
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

// ─── Manager: package detail sheet ──────────────────────────────────────────
const showPkgDetail   = ref(false)
const pkgDetail       = ref<Package | null>(null)
const pkgDetailLoading = ref(false)

async function openPackageDetail(pkg: Package) {
  if (!isManager.value) return
  showPkgDetail.value = true
  pkgDetailLoading.value = true
  pkgDetail.value = null
  try {
    const { data } = await packagesApi.getForManager(pkg.package_id)
    pkgDetail.value = data
  } catch (err) {
    toast.error(apiError(err, 'Impossible de charger le détail du colis.'))
    showPkgDetail.value = false
  } finally {
    pkgDetailLoading.value = false
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
    const { data: pkgResult } = await packagesApi.getAll({ limit: '1000' })
    pendingPackages.value = pkgResult.data.filter((p) => p.status === 'pending')
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

function creatorInitials(c: TravelCreator) {
  return `${c.first_name[0]}${c.last_name[0]}`.toUpperCase()
}

function shareTravel() {
  if (!travel.value) return
  const url = `${window.location.origin}/voyages/${travel.value.travel_id}`
  const title = `Voyage ${travel.value.origin.name} → ${travel.value.destination.name}`
  if (navigator.share) {
    navigator.share({ title, url }).catch(() => {})
  } else {
    navigator.clipboard.writeText(url)
    toast.success('Lien copié dans le presse-papier.')
  }
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const [travelRes, pkgsRes] = await Promise.all([
      travelsApi.getById(travelId.value),
      packagesApi.getAll({ travel_id: String(travelId.value), limit: '1000' }),
    ])
    travel.value = travelRes.data
    packages.value = pkgsRes.data.data.filter((p) => p.travel_id === travelId.value)
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
                <span class="text-lg font-bold text-app-primary">{{ travel.origin.name }}</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
                <span class="text-lg font-bold text-app-primary">{{ travel.destination.name }}</span>
              </div>
              <p v-if="travel.itinerary" class="text-[13px] text-app-muted mt-1">{{ travel.itinerary }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <StatusBadge :status="travel.status" />
              <!-- Bouton partager -->
              <button
                class="w-8 h-8 rounded-full glass flex items-center justify-center cursor-pointer border-none text-app-muted transition-colors hover:text-app-primary shrink-0"
                @click="shareTravel"
                aria-label="Partager ce voyage"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </button>
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

        <!-- Carte groupeur (clients uniquement) -->
        <div
          v-if="isClient && travel.creator"
          class="glass rounded-[20px] p-4 flex items-center gap-3.5 cursor-pointer transition-colors active:bg-[var(--glass-bg)]"
          @click="router.push(`/groupeur/${travel.creator.user_id}`)"
        >
          <!-- Avatar -->
          <div class="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-white/10">
            <img
              v-if="(travel.creator as any).profile_picture"
              :src="(travel.creator as any).profile_picture"
              alt="Avatar"
              class="w-full h-full object-cover"
            />
            <div
              v-else
              class="w-full h-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center"
            >
              <span class="text-base font-bold text-white">{{ creatorInitials(travel.creator) }}</span>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[11px] font-medium text-app-muted uppercase tracking-[0.05em]">Transitaire</p>
            <p class="text-[15px] font-bold text-app-primary truncate">{{ travel.creator.first_name }} {{ travel.creator.last_name }}</p>
            <p class="text-[12px] text-app-muted truncate">{{ travel.creator.phone }}</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-app-faint shrink-0">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
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

        <!-- ── Submitted packages (manager review queue) ── -->
        <template v-if="isManager && submittedPackages.length > 0">
          <div class="flex flex-col gap-2.5">
            <div class="flex items-center gap-2">
              <h3 class="text-base font-bold text-app-primary">À valider</h3>
              <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--primary)] text-white text-[11px] font-bold">{{ submittedPackages.length }}</span>
            </div>

            <div class="flex flex-col gap-2">
              <div
                v-for="pkg in submittedPackages"
                :key="pkg.package_id"
                class="rounded-[16px] p-4 flex flex-col gap-3 border border-[var(--primary-25)] bg-[var(--primary-05,var(--primary-10))]"
              >
                <!-- Top row -->
                <div
                  class="flex items-center justify-between cursor-pointer"
                  @click="openPackageDetail(pkg)"
                >
                  <div class="flex-1 min-w-0">
                    <span class="text-[12px] font-bold text-[var(--primary)] font-mono tracking-[0.05em]">{{ pkg.tracking_number }}</span>
                    <p class="text-[13px] font-semibold text-app-primary mt-0.5">{{ pkg.description }}</p>
                    <div class="flex items-center gap-1.5 text-xs text-app-faint mt-0.5">
                      <span>{{ pkg.weight }} kg</span><span>·</span>
                      <span>{{ pkg.volume }} m³</span><span>·</span>
                      <span>{{ pkg.declared_value }} €</span>
                      <template v-if="travel?.price_per_unit">
                        <span>·</span>
                        <span class="text-amber-400 font-semibold">
                          ~{{ (
                            Number(travel.price_per_unit) *
                            (travel.transport_type === 'plane' ? Number(pkg.weight) : Number(pkg.volume)) *
                            ({ normal: 1, fragile: 1.2, tres_fragile: 1.5 }[pkg.fragility] ?? 1)
                          ).toFixed(2) }} €
                        </span>
                      </template>
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-app-faint shrink-0 ml-2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>

                <!-- Action buttons -->
                <div class="flex gap-2 pt-1 border-t border-[var(--primary-25)]">
                  <button
                    class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] text-[13px] font-semibold cursor-pointer transition-all border-[1.5px] border-[var(--primary)] text-[var(--primary)] bg-[var(--primary-10)] hover:bg-[var(--primary-20)] active:scale-[0.97] disabled:opacity-40"
                    :disabled="pkgStatusLoading[pkg.package_id]"
                    @click.stop="updatePackageStatus(pkg, 'validate')"
                  >
                    <svg v-if="pkgStatusLoading[pkg.package_id]" class="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Accepter
                  </button>
                  <button
                    class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] text-[13px] font-semibold cursor-pointer transition-all border-[1.5px] border-[rgba(239,68,68,0.35)] text-red-400 bg-[rgba(239,68,68,0.08)] hover:bg-[rgba(239,68,68,0.14)] active:scale-[0.97] disabled:opacity-40"
                    :disabled="pkgStatusLoading[pkg.package_id]"
                    @click.stop="updatePackageStatus(pkg, 'reject')"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Rejeter
                  </button>
                </div>

                <p v-if="pkgStatusError[pkg.package_id]" class="text-[11px] text-red-400 -mt-1">{{ pkgStatusError[pkg.package_id] }}</p>
              </div>
            </div>
          </div>
        </template>

        <!-- ── All other packages ── -->
        <div class="flex flex-col gap-2.5">
          <h3 class="text-base font-bold text-app-primary">
            Colis associés ({{ otherPackages.length }})
          </h3>

          <div v-if="packages.length === 0" class="py-6 text-center text-sm text-app-muted">
            Aucun colis pour ce voyage.
          </div>
          <div v-else-if="otherPackages.length === 0 && submittedPackages.length > 0" class="py-4 text-center text-sm text-app-muted">
            Aucun colis intégré pour l'instant.
          </div>

          <div v-else class="flex flex-col gap-2">
            <div
              v-for="pkg in otherPackages"
              :key="pkg.package_id"
              class="glass-subtle rounded-[14px] p-3.5 flex flex-col gap-1.5 transition-transform duration-100"
              :class="isManager ? 'cursor-pointer active:scale-[0.99]' : ''"
              @click="openPackageDetail(pkg)"
            >
              <div class="flex items-center justify-between">
                <span class="text-[13px] font-bold text-[var(--primary)] font-mono tracking-[0.05em]">{{ pkg.tracking_number }}</span>
                <StatusBadge :status="pkg.status" />
              </div>
              <p class="text-[13px] text-app-muted">{{ pkg.description }}</p>
              <div class="flex items-center gap-1.5 text-xs text-app-faint">
                <span>{{ pkg.weight }} kg</span><span>·</span>
                <span>{{ pkg.volume }} m³</span><span>·</span>
                <span>{{ pkg.declared_value }} €</span>
                <template v-if="pkg.price != null">
                  <span>·</span>
                  <span class="text-[var(--primary)] font-semibold">{{ Number(pkg.price).toFixed(2) }} €</span>
                </template>
              </div>

              <!-- Package actions for manager (non-submitted) -->
              <template v-if="isManager && (packageActions(pkg).length > 0 || pkg.status === 'in_travel')">
                <div class="border-t border-[var(--glass-border)] mt-1 pt-2 flex items-center gap-2 flex-wrap">
                  <button
                    v-for="action in packageActions(pkg)"
                    :key="action.target"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border-[1.5px] cursor-pointer transition-all active:scale-[0.96] disabled:opacity-40"
                    :class="action.danger
                      ? 'border-[rgba(239,68,68,0.35)] text-red-400 bg-[rgba(239,68,68,0.08)] hover:bg-[rgba(239,68,68,0.14)]'
                      : 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary-10)] hover:bg-[var(--primary-15)]'"
                    :disabled="pkgStatusLoading[pkg.package_id]"
                    @click.stop="updatePackageStatus(pkg, action.target)"
                  >
                    <svg v-if="pkgStatusLoading[pkg.package_id]" class="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    {{ action.label }}
                  </button>
                  <button
                    v-if="pkg.status === 'in_travel'"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border-[1.5px] cursor-pointer transition-all active:scale-[0.96] disabled:opacity-40 border-[var(--primary-30)] text-[var(--primary)] bg-transparent hover:bg-[var(--primary-10)]"
                    :disabled="pkgStatusLoading[pkg.package_id]"
                    @click.stop="openMoveSheet(pkg)"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                    </svg>
                    Déplacer
                  </button>
                  <p v-if="pkgStatusError[pkg.package_id]" class="text-[11px] text-red-400 w-full">{{ pkgStatusError[pkg.package_id] }}</p>
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

    <!-- Reassign dialog (colis engagés) -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showReassignDialog" class="overlay flex items-end md:items-center justify-center px-4" @click.self="showReassignDialog = false">
          <Transition name="slide-up">
            <div v-if="showReassignDialog" class="sheet w-full max-w-[480px] md:rounded-3xl rounded-t-3xl flex flex-col" style="max-height: 88dvh;">
              <div class="w-9 h-1 bg-[var(--primary-30)] rounded-full mx-auto mt-4 shrink-0" />

              <!-- Header -->
              <div class="flex items-center justify-between px-5 py-4 shrink-0">
                <h2 class="text-[17px] font-extrabold text-app-primary">Annuler le voyage</h2>
                <button class="w-8 h-8 rounded-full glass flex items-center justify-center text-app-muted cursor-pointer border-none text-lg leading-none" @click="showReassignDialog = false">×</button>
              </div>
              <div class="border-t border-[var(--glass-border)] shrink-0" />

              <div class="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
                <!-- Avertissement -->
                <div class="flex items-start gap-3 px-3.5 py-3 bg-amber-500/10 border border-amber-500/25 rounded-[14px]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-400 shrink-0 mt-0.5">
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <p class="text-[13px] text-amber-400 leading-snug">
                    Ce voyage contient <strong>{{ inTravelPackages.length }} colis engagé{{ inTravelPackages.length > 1 ? 's' : '' }}</strong>.
                    Choisissez un autre voyage ouvert pour les transférer avant l'annulation.
                  </p>
                </div>

                <!-- Liste des voyages disponibles -->
                <div class="flex flex-col gap-2">
                  <p class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em]">Voyage de destination</p>

                  <div v-if="reassignTravelsLoading" class="flex flex-col gap-2">
                    <div v-for="i in 3" :key="i" class="skeleton h-[68px] rounded-[14px]" />
                  </div>

                  <div v-else-if="reassignTravels.length === 0" class="py-6 text-center text-sm text-app-muted">
                    Aucun autre voyage ouvert disponible.<br>
                    <span class="text-xs text-app-faint">Créez un nouveau voyage avant d'annuler celui-ci.</span>
                  </div>

                  <div v-else class="flex flex-col gap-2">
                    <div
                      v-for="t in reassignTravels"
                      :key="t.travel_id"
                      class="flex items-center gap-3 px-3.5 py-3 rounded-[14px] cursor-pointer transition-all border"
                      :class="reassignTargetTravel?.travel_id === t.travel_id
                        ? 'bg-[var(--primary-15)] border-[var(--primary)]'
                        : 'glass-subtle border-transparent'"
                      @click="reassignTargetTravel = t"
                    >
                      <div class="w-9 h-9 rounded-[10px] bg-[var(--primary-15)] border border-[var(--primary-25)] flex items-center justify-center text-[var(--primary)] shrink-0">
                        <svg v-if="t.transport_type === 'ship'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M2 21c.6.5 1.2 1 2.5 1C7 22 7 20 9.5 20c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
                          <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/>
                          <path d="M19 13V7a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v6"/><path d="M12 10v4"/><path d="M12 2v3"/>
                        </svg>
                        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 4H6L4 2 2 2v2l2 2-3 7 2.8.6"/>
                          <path d="M15 15l-5.4-5.4"/><path d="M5 19 7 21"/><path d="M19 19l2 2"/>
                        </svg>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-[14px] font-bold text-app-primary truncate">{{ t.origin.name }} → {{ t.destination.name }}</p>
                        <p class="text-[12px] text-app-muted">{{ t.packages_count }} colis · #{{ t.travel_id }}</p>
                      </div>
                      <div v-if="reassignTargetTravel?.travel_id === t.travel_id" class="w-5 h-5 rounded-full bg-[var(--primary)] flex items-center justify-center shrink-0">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="border-t border-[var(--glass-border)] shrink-0 px-5 py-4 flex gap-2.5">
                <button
                  class="flex-1 px-4 py-2.5 rounded-[12px] text-sm font-semibold text-app-muted glass cursor-pointer border-none transition-all hover:text-app-primary active:scale-[0.97]"
                  @click="showReassignDialog = false"
                >
                  Retour
                </button>
                <button
                  class="flex-1 px-4 py-2.5 rounded-[12px] text-sm font-semibold cursor-pointer transition-all border-[1.5px] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                  :class="reassignTargetTravel
                    ? 'bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.25)] text-red-400 hover:bg-[rgba(239,68,68,0.15)]'
                    : 'bg-transparent border-[var(--glass-border)] text-app-faint'"
                  :disabled="!reassignTargetTravel || reassignLoading"
                  @click="confirmCancelWithReassign"
                >
                  <span v-if="reassignLoading" class="btn-spinner border-red-400/40 border-t-red-400" />
                  <span v-else>Transférer et annuler</span>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- Manager: package detail sheet -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showPkgDetail" class="overlay flex items-end md:items-center justify-center" @click.self="showPkgDetail = false">
          <Transition name="slide-up">
            <div v-if="showPkgDetail" class="sheet w-full max-w-[520px] md:rounded-3xl rounded-t-3xl flex flex-col" style="max-height: 92dvh;">
              <div class="w-9 h-1 bg-[var(--primary-30)] rounded-full mx-auto mt-4 shrink-0" />

              <!-- Header -->
              <div class="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
                <h2 class="text-[17px] font-bold text-app-primary">Détail du colis</h2>
                <button class="w-8 h-8 rounded-full glass flex items-center justify-center text-app-muted cursor-pointer border-none" @click="showPkgDetail = false">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <!-- Loading -->
              <div v-if="pkgDetailLoading" class="flex-1 flex items-center justify-center py-12">
                <svg class="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              </div>

              <!-- Content -->
              <div v-else-if="pkgDetail" class="flex-1 overflow-y-auto px-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] flex flex-col gap-4">

                <!-- Tracking + status -->
                <div class="flex items-center justify-between gap-3 py-1">
                  <span class="text-sm font-bold text-[var(--primary)] font-mono tracking-wider">{{ pkgDetail.tracking_number }}</span>
                  <StatusBadge :status="pkgDetail.status" />
                </div>

                <!-- Images -->
                <div v-if="pkgDetail.image1" class="flex gap-2 overflow-x-auto">
                  <img
                    v-for="(img, i) in [pkgDetail.image1, pkgDetail.image2, pkgDetail.image3, pkgDetail.image4].filter(Boolean)"
                    :key="i"
                    :src="img!"
                    class="h-[100px] w-[100px] object-cover rounded-[12px] shrink-0"
                  />
                </div>

                <!-- Package info -->
                <div class="glass rounded-[14px] p-4 flex flex-col gap-3">
                  <h3 class="text-[12px] font-semibold text-app-muted uppercase tracking-[0.06em]">Informations colis</h3>
                  <p class="text-sm text-app-primary">{{ pkgDetail.description }}</p>
                  <div class="grid grid-cols-3 gap-2">
                    <div class="flex flex-col gap-0.5">
                      <span class="text-[10px] text-app-muted uppercase tracking-[0.05em]">Poids</span>
                      <span class="text-sm font-semibold text-app-primary">{{ pkgDetail.weight }} kg</span>
                    </div>
                    <div class="flex flex-col gap-0.5">
                      <span class="text-[10px] text-app-muted uppercase tracking-[0.05em]">Volume</span>
                      <span class="text-sm font-semibold text-app-primary">{{ pkgDetail.volume }} m³</span>
                    </div>
                    <div class="flex flex-col gap-0.5">
                      <span class="text-[10px] text-app-muted uppercase tracking-[0.05em]">Valeur déclarée</span>
                      <span class="text-sm font-semibold text-app-primary">{{ pkgDetail.declared_value }} €</span>
                    </div>
                  </div>
                  <div v-if="pkgDetail.special_instructions" class="text-[12px] text-app-muted border-t border-[var(--glass-border)] pt-2 mt-1">
                    <span class="font-medium text-app-primary">Instructions : </span>{{ pkgDetail.special_instructions }}
                  </div>
                </div>

                <!-- Client info -->
                <div v-if="pkgDetail.client" class="glass rounded-[14px] p-4 flex flex-col gap-3">
                  <h3 class="text-[12px] font-semibold text-app-muted uppercase tracking-[0.06em]">Client</h3>
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-[var(--primary-15)] border border-[var(--primary-25)] flex items-center justify-center text-sm font-bold text-[var(--primary)] shrink-0">
                      {{ pkgDetail.client.first_name[0] }}{{ pkgDetail.client.last_name[0] }}
                    </div>
                    <div>
                      <p class="text-sm font-bold text-app-primary">{{ pkgDetail.client.first_name }} {{ pkgDetail.client.last_name }}</p>
                      <p class="text-[12px] text-app-muted">{{ pkgDetail.client.email }}</p>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-2 border-t border-[var(--glass-border)] pt-2">
                    <div v-if="pkgDetail.client.phone" class="flex flex-col gap-0.5">
                      <span class="text-[10px] text-app-muted uppercase tracking-[0.05em]">Téléphone</span>
                      <a :href="`tel:${pkgDetail.client.phone}`" class="text-sm font-semibold text-[var(--primary)]">{{ pkgDetail.client.phone }}</a>
                    </div>
                    <div v-if="pkgDetail.client.city" class="flex flex-col gap-0.5">
                      <span class="text-[10px] text-app-muted uppercase tracking-[0.05em]">Ville</span>
                      <span class="text-sm font-semibold text-app-primary">{{ pkgDetail.client.city }}{{ pkgDetail.client.country ? ', ' + pkgDetail.client.country : '' }}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </Transition>
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
    <!-- Move package sheet -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showMoveSheet" class="overlay flex items-end md:items-center justify-center px-4" @click.self="showMoveSheet = false">
          <Transition name="slide-up">
            <div v-if="showMoveSheet" class="sheet w-full max-w-[480px] md:rounded-3xl rounded-t-3xl flex flex-col" style="max-height: 88dvh;">
              <div class="w-9 h-1 bg-[var(--primary-30)] rounded-full mx-auto mt-4 shrink-0" />

              <!-- Header -->
              <div class="flex items-center justify-between px-5 py-4 shrink-0">
                <div>
                  <h2 class="text-[17px] font-extrabold text-app-primary">Déplacer le colis</h2>
                  <p v-if="movingPkg" class="text-[12px] text-app-muted font-mono mt-0.5">{{ movingPkg.tracking_number }}</p>
                </div>
                <button class="w-8 h-8 rounded-full glass flex items-center justify-center text-app-muted cursor-pointer border-none text-lg leading-none" @click="showMoveSheet = false">×</button>
              </div>
              <div class="border-t border-[var(--glass-border)] shrink-0" />

              <div class="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
                <div class="flex flex-col gap-2">
                  <p class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em]">Choisir le voyage de destination</p>

                  <div v-if="moveTravelsLoading" class="flex flex-col gap-2">
                    <div v-for="i in 3" :key="i" class="skeleton h-[68px] rounded-[14px]" />
                  </div>

                  <div v-else-if="moveTravels.length === 0" class="py-6 text-center text-sm text-app-muted">
                    Aucun autre voyage ouvert disponible.
                  </div>

                  <div v-else class="flex flex-col gap-2">
                    <div
                      v-for="t in moveTravels"
                      :key="t.travel_id"
                      class="flex items-center gap-3 px-3.5 py-3 rounded-[14px] cursor-pointer transition-all border"
                      :class="moveTarget?.travel_id === t.travel_id
                        ? 'bg-[var(--primary-15)] border-[var(--primary)]'
                        : 'glass-subtle border-transparent'"
                      @click="moveTarget = t"
                    >
                      <div class="w-9 h-9 rounded-[10px] bg-[var(--primary-15)] border border-[var(--primary-25)] flex items-center justify-center text-[var(--primary)] shrink-0">
                        <svg v-if="t.transport_type === 'ship'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M2 21c.6.5 1.2 1 2.5 1C7 22 7 20 9.5 20c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
                          <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/>
                          <path d="M19 13V7a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v6"/><path d="M12 10v4"/><path d="M12 2v3"/>
                        </svg>
                        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 4H6L4 2 2 2v2l2 2-3 7 2.8.6"/>
                          <path d="M15 15l-5.4-5.4"/><path d="M5 19 7 21"/><path d="M19 19l2 2"/>
                        </svg>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-[14px] font-bold text-app-primary truncate">{{ t.origin.name }} → {{ t.destination.name }}</p>
                        <p class="text-[12px] text-app-muted">{{ t.packages_count }} colis · #{{ t.travel_id }}</p>
                      </div>
                      <div v-if="moveTarget?.travel_id === t.travel_id" class="w-5 h-5 rounded-full bg-[var(--primary)] flex items-center justify-center shrink-0">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="border-t border-[var(--glass-border)] shrink-0 px-5 py-4 flex gap-2.5">
                <button
                  class="flex-1 px-4 py-2.5 rounded-[12px] text-sm font-semibold text-app-muted glass cursor-pointer border-none transition-all hover:text-app-primary active:scale-[0.97]"
                  @click="showMoveSheet = false"
                >
                  Retour
                </button>
                <button
                  class="flex-1 px-4 py-2.5 rounded-[12px] text-sm font-semibold cursor-pointer transition-all border-[1.5px] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                  :class="moveTarget
                    ? 'bg-[var(--primary-10)] border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary-15)]'
                    : 'bg-transparent border-[var(--glass-border)] text-app-faint'"
                  :disabled="!moveTarget || moveLoading"
                  @click="confirmMove"
                >
                  <span v-if="moveLoading" class="btn-spinner" />
                  <span v-else>Déplacer</span>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- Lien signalement discret (clients uniquement) -->
    <div v-if="isClient && travel && !loading" class="px-4 sm:px-6 lg:px-8 pb-4 flex justify-center">
      <button
        class="flex items-center gap-1.5 text-[12px] text-app-faint cursor-pointer bg-transparent border-none p-0 transition-colors hover:text-red-400"
        @click="showReport = true"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Signaler ce voyage
      </button>
    </div>

    <!-- Report sheet -->
    <ReportSheet
      v-if="travel"
      v-model="showReport"
      target-type="travel"
      :target-id="travel.travel_id"
      :target-label="`Voyage #${travel.travel_id} — ${travel.origin.name} → ${travel.destination.name}`"
    />
  </AppLayout>
</template>
