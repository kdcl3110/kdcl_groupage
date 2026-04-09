<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import PackageFormSheet from '@/components/package/PackageFormSheet.vue'
import PaymentSheet from '@/components/payment/PaymentSheet.vue'
import type { PackageFormPayload, PackageFormInitialValues } from '@/components/package/PackageFormSheet.vue'
import { packagesApi } from '@/api/packages'
import { recipientsApi } from '@/api/recipients'
import { travelsApi } from '@/api/travels'
import { useToastStore, apiError } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'
import { useCurrencyStore } from '@/stores/currency'
import type { Package, Recipient, Travel } from '@/types'

const auth = useAuthStore()
const currencyStore = useCurrencyStore()
const isClient = computed(() => auth.user?.role === 'client')

const route = useRoute()
const router = useRouter()

const packageId = computed(() => Number(route.params.id))

const pkg = ref<Package | null>(null)
const recipient = ref<Recipient | null>(null)
const travel = ref<Travel | null>(null)
const loading = ref(true)
const error = ref('')
const activeImage = ref(0)
const cancelLoading = ref(false)
const showCancelDialog = ref(false)

const images = computed(() => {
  if (!pkg.value) return []
  return [pkg.value.image1, pkg.value.image2, pkg.value.image3, pkg.value.image4].filter(
    (img): img is string => img !== null && img !== undefined && img !== '',
  )
})

function formatDate(date: string | null | undefined) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

const statusSteps = [
  { key: 'created',          label: 'Créé' },
  { key: 'submitted',        label: 'Soumis' },
  { key: 'awaiting_payment', label: 'Accepté' },
  { key: 'paid',             label: 'Payé' },
  { key: 'in_travel',        label: 'En voyage' },
  { key: 'in_transit',       label: 'En transit' },
  { key: 'delivered',        label: 'Livré' },
]

const currentStepIndex = computed(() => {
  if (!pkg.value) return -1
  const status = pkg.value.status
  if (status === 'pending')           return 0
  if (status === 'submitted')         return 1
  if (status === 'awaiting_payment')  return 2
  if (status === 'paid')              return 3
  if (status === 'in_travel')         return 4
  if (status === 'in_transit')        return 5
  if (status === 'delivered')         return 6
  return -1 // cancelled, returned
})

const canCancel = computed(() =>
  pkg.value?.status === 'pending' || pkg.value?.status === 'submitted'
)

// ─── Payment ──────────────────────────────────────────────────────────────────
const showPaymentSheet = ref(false)
const canPay = computed(() => isClient.value && pkg.value?.status === 'awaiting_payment')
const canEdit = computed(() => pkg.value?.status === 'pending')
const toast = useToastStore()

const displayStatus = computed(() => pkg.value?.status ?? '')

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await packagesApi.getById(packageId.value)
    pkg.value = data

    const fetches: Promise<void>[] = []
    if (data.recipient_id) {
      fetches.push(
        recipientsApi.getById(data.recipient_id).then((r) => {
          recipient.value = r.data
        }),
      )
    }
    if (data.travel_id) {
      fetches.push(
        travelsApi.getById(data.travel_id).then((r) => {
          travel.value = r.data
        }),
      )
    }
    await Promise.all(fetches)
  } catch {
    error.value = 'Impossible de charger les données du colis.'
  } finally {
    loading.value = false
  }
}

const isWithdrawing = computed(() => pkg.value?.status === 'submitted')

async function handleCancel() {
  const wasSubmitted = pkg.value?.status === 'submitted'
  cancelLoading.value = true
  try {
    const { data } = await packagesApi.cancel(packageId.value)
    if (pkg.value) {
      pkg.value.status = data.newStatus as typeof pkg.value.status
      if (data.newStatus === 'pending') {
        pkg.value.travel_id = null
        travel.value = null
      }
    }
    showCancelDialog.value = false
    toast.success(wasSubmitted ? 'Soumission retirée. Le colis est de nouveau en attente.' : 'Colis annulé.')
  } catch (err) {
    toast.error(apiError(err, 'Impossible d\'effectuer cette action.'))
  } finally {
    cancelLoading.value = false
  }
}

function prevImage() {
  if (images.value.length === 0) return
  activeImage.value = (activeImage.value - 1 + images.value.length) % images.value.length
}

function nextImage() {
  if (images.value.length === 0) return
  activeImage.value = (activeImage.value + 1) % images.value.length
}

const transportLabel = computed(() => {
  if (!travel.value) return ''
  return travel.value.transport_type === 'ship' ? 'Maritime' : 'Aérien'
})

// ─── Submit to voyage ─────────────────────────────────────────────────────────
const showVoyageSheet = ref(false)
const availableVoyages = ref<Travel[]>([])
const voyagesLoading = ref(false)
const submitLoading = ref<number | null>(null)

const canSubmit = computed(() => pkg.value?.status === 'pending')

async function openVoyageSheet() {
  showVoyageSheet.value = true
  voyagesLoading.value = true
  try {
    const { data: result } = await travelsApi.getAll({ status: 'open', limit: '200' })
    availableVoyages.value = result.data
  } catch {
    availableVoyages.value = []
  } finally {
    voyagesLoading.value = false
  }
}

function formatDeparture(date: string | null) {
  if (!date) return 'Date non définie'
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function handleSubmit(travelId: number) {
  submitLoading.value = travelId
  try {
    const { data: updatedPkg } = await packagesApi.submit(packageId.value, travelId)
    pkg.value = updatedPkg
    const { data } = await travelsApi.getById(travelId)
    travel.value = data
    showVoyageSheet.value = false
    toast.success('Colis soumis. En attente de validation par le transitaire.')
  } catch (err) {
    toast.error(apiError(err, 'Impossible de soumettre le colis.'))
  } finally {
    submitLoading.value = null
  }
}

// ─── Edit sheet ───────────────────────────────────────────────────────────────
const showEditSheet = ref(false)
const editLoading   = ref(false)
const editError     = ref('')

const editInitialValues = computed((): PackageFormInitialValues | undefined => {
  if (!pkg.value) return undefined
  return {
    description:        pkg.value.description,
    weight:             String(pkg.value.weight),
    volume:             String(pkg.value.volume),
    declared_value:     String(pkg.value.declared_value),
    special_instructions: pkg.value.special_instructions ?? '',
    selectedRecipient:  recipient.value,
    existingImages: [
      pkg.value.image1 ?? null,
      pkg.value.image2 ?? null,
      pkg.value.image3 ?? null,
      pkg.value.image4 ?? null,
    ],
  }
})

async function handleEditSubmit(payload: PackageFormPayload) {
  editError.value = ''
  editLoading.value = true
  try {
    const fd = new FormData()
    fd.append('description', payload.description)
    fd.append('weight', payload.weight)
    fd.append('volume', payload.volume)
    fd.append('declared_value', payload.declared_value)
    fd.append('special_instructions', payload.special_instructions)
    fd.append('recipient_id', String(payload.recipient_id))
    for (let i = 0; i < 4; i++) {
      const field = `image${i + 1}`
      if (payload.imgFiles[i]) {
        fd.append(field, payload.imgFiles[i]!)
      } else if (i > 0 && payload.imgRemoved[i]) {
        fd.append(`remove_${field}`, 'true')
      }
    }
    const { data } = await packagesApi.update(packageId.value, fd)
    pkg.value = data
    const updatedRecipient = (await recipientsApi.getById(payload.recipient_id)).data
    recipient.value = updatedRecipient
    showEditSheet.value = false
    toast.success('Colis modifié avec succès.')
  } catch (err) {
    editError.value = apiError(err, 'Erreur lors de la modification du colis.')
  } finally {
    editLoading.value = false
  }
}

const FRAGILITY_LABEL: Record<string, string> = {
  normal:       'Normal',
  fragile:      'Fragile',
  tres_fragile: 'Très fragile',
}
const FRAGILITY_MULTIPLIER: Record<string, number> = {
  normal: 1, fragile: 1.2, tres_fragile: 1.5,
}

const fragilityLabel = computed(() => FRAGILITY_LABEL[pkg.value?.fragility ?? 'normal'] ?? 'Normal')

// Prix estimé (colis soumis, voyage avec price_per_unit)
const estimatedPrice = computed(() => {
  if (!pkg.value || !travel.value || !travel.value.price_per_unit) return null
  const base = travel.value.transport_type === 'plane'
    ? Number(travel.value.price_per_unit) * Number(pkg.value.weight)
    : Number(travel.value.price_per_unit) * Number(pkg.value.volume)
  const mult = FRAGILITY_MULTIPLIER[pkg.value.fragility] ?? 1
  return Math.round(base * mult * 100) / 100
})

// Prix à afficher : confirmé si disponible, sinon estimé
const displayPrice = computed(() => {
  if (pkg.value?.price != null) return { value: pkg.value.price, confirmed: true }
  if (estimatedPrice.value != null) return { value: estimatedPrice.value, confirmed: false }
  return null
})

onMounted(fetchData)
</script>

<template>
  <AppLayout>
    <div class="pb-8">

      <!-- Back button row -->
      <div class="px-4 sm:px-6 pt-4 pb-3">
        <button
          @click="router.back()"
          class="flex items-center gap-1 text-sm text-app-muted cursor-pointer bg-transparent border-none p-0 transition-colors hover:text-app-primary"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Retour
        </button>
      </div>

      <!-- Loading skeletons -->
      <div v-if="loading" class="px-4 sm:px-6 flex flex-col gap-4">
        <div class="skeleton w-full rounded-[0px]" style="height: 280px;" />
        <div class="skeleton h-7 w-[60%]" />
        <div class="skeleton h-4 w-[40%]" />
        <div class="skeleton h-[72px] rounded-[20px]" />
        <div class="skeleton h-[120px] rounded-[20px]" />
        <div class="skeleton h-[80px] rounded-[20px]" />
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="px-4 sm:px-6 flex flex-col items-center gap-3 py-16 text-center text-app-muted">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="opacity-40">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p class="font-semibold text-app-primary">Erreur</p>
        <p class="text-sm">{{ error }}</p>
        <button
          class="mt-3 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-[var(--primary)] border-[1.5px] border-[var(--primary)] bg-transparent transition-colors hover:bg-[var(--primary-10)] cursor-pointer"
          @click="fetchData"
        >
          Réessayer
        </button>
      </div>

      <!-- Content -->
      <template v-else-if="pkg">

        <!-- IMAGE GALLERY -->
        <div class="relative overflow-hidden bg-black/30" style="height: clamp(280px, 40vw, 340px);">
          <!-- Image -->
          <img
            v-if="images.length > 0"
            :src="images[activeImage]"
            :alt="pkg.description"
            class="absolute inset-0 w-full h-full object-cover"
          />
          <!-- No image placeholder -->
          <div v-else class="absolute inset-0 flex items-center justify-center bg-white/[0.03]">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" class="text-white/10">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>

          <!-- Tap areas for navigation (only if multiple images) -->
          <template v-if="images.length > 1">
            <button
              class="absolute left-0 top-0 bottom-0 w-1/2 bg-transparent border-none cursor-pointer"
              @click="prevImage"
              aria-label="Image précédente"
            />
            <button
              class="absolute right-0 top-0 bottom-0 w-1/2 bg-transparent border-none cursor-pointer"
              @click="nextImage"
              aria-label="Image suivante"
            />
          </template>

          <!-- Gradient overlay -->
          <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

          <!-- Bottom overlay: tracking + status -->
          <div class="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 pb-4 pointer-events-none">
            <span class="font-mono text-[12px] text-white/70 tracking-[0.08em]">{{ pkg.tracking_number }}</span>
            <StatusBadge :status="displayStatus" />
          </div>

          <!-- Dot indicators -->
          <div v-if="images.length > 1" class="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-1.5 pointer-events-none">
            <div
              v-for="(_, i) in images"
              :key="i"
              class="rounded-full transition-all duration-200"
              :class="i === activeImage ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'"
            />
          </div>
        </div>

        <!-- Thumbnail strip -->
        <div v-if="images.length > 1" class="flex gap-2 overflow-x-auto scrollbar-hide px-4 sm:px-6 pt-3 pb-1">
          <button
            v-for="(img, i) in images"
            :key="i"
            class="shrink-0 w-[60px] h-[60px] rounded-[10px] overflow-hidden border-2 transition-all duration-150 cursor-pointer bg-transparent p-0"
            :style="i === activeImage ? 'border-color: var(--primary);' : 'border-color: transparent;'"
            @click="activeImage = i"
          >
            <img :src="img" class="w-full h-full object-cover" :alt="`Photo ${i + 1}`" />
          </button>
        </div>

        <!-- MAIN CONTENT -->
        <div class="px-4 sm:px-6 flex flex-col gap-5 mt-5">

          <!-- Description + tracking -->
          <div>
            <h1 class="text-xl font-extrabold text-app-primary tracking-tight leading-tight">{{ pkg.description }}</h1>
            <p class="text-[13px] text-app-faint font-mono mt-1">{{ pkg.tracking_number }}</p>
          </div>

          <!-- STATUS TIMELINE -->
          <div v-if="currentStepIndex >= 0" class="glass rounded-[20px] p-4">
            <p class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em] mb-4">Statut</p>
            <div class="flex items-start">
              <template v-for="(step, i) in statusSteps" :key="step.key">
                <!-- Step -->
                <div class="flex flex-col items-center gap-1.5 flex-shrink-0" style="min-width: 0;">
                  <div
                    class="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 border-2"
                    :style="i <= currentStepIndex
                      ? 'background: var(--primary); border-color: var(--primary);'
                      : 'background: transparent; border-color: var(--bar-track);'"
                  >
                    <svg
                      v-if="i <= currentStepIndex"
                      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <span class="text-[10px] text-app-muted text-center truncate w-full max-w-[64px]" :class="i <= currentStepIndex ? 'text-app-primary font-semibold' : ''">{{ step.label }}</span>
                </div>
                <!-- Connector line (not after last) -->
                <div
                  v-if="i < statusSteps.length - 1"
                  class="flex-1 h-[2px] mt-[13px] transition-all duration-300"
                  :style="i < currentStepIndex ? 'background: var(--primary)' : 'background: var(--bar-track)'"
                />
              </template>
            </div>
          </div>

          <!-- Payment required banner -->
          <div v-if="canPay" class="glass rounded-[20px] p-4 border border-amber-500/30 bg-amber-500/5 flex flex-col gap-3">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-400">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-amber-300">Paiement requis</p>
                <p class="text-[12px] text-app-muted">{{ currencyStore.formatAmount(pkg.price ?? 0) }} · délai 48h après acceptation</p>
              </div>
            </div>
            <button
              @click="showPaymentSheet = true"
              class="w-full flex items-center justify-center gap-2 py-[13px] rounded-[14px] bg-amber-500 text-white text-[15px] font-semibold cursor-pointer transition-opacity active:opacity-80 border-none"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              Payer maintenant
            </button>
          </div>

          <!-- Cancelled / Returned badge -->
          <div v-else-if="currentStepIndex < 0" class="glass rounded-[20px] p-4 flex items-center gap-3">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              :class="pkg.status === 'cancelled' ? 'bg-red-500/15' : 'bg-amber-500/15'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                :class="pkg.status === 'cancelled' ? 'text-red-400' : 'text-amber-400'">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <div>
              <p class="text-sm font-semibold" :class="pkg.status === 'cancelled' ? 'text-red-400' : 'text-amber-400'">
                {{ pkg.status === 'cancelled' ? 'Colis annulé' : 'Colis retourné' }}
              </p>
              <p class="text-[12px] text-app-muted">Ce colis ne sera pas livré.</p>
            </div>
          </div>

          <!-- DETAILS SECTION -->
          <div class="glass rounded-[20px] p-4 flex flex-col gap-4">
            <p class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em]">Détails</p>
            <div class="grid grid-cols-2 gap-y-4 gap-x-3">
              <div class="flex flex-col gap-0.5">
                <span class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em]">Poids</span>
                <span class="text-[14px] font-bold text-app-primary">{{ pkg.weight }} kg</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em]">Volume</span>
                <span class="text-[14px] font-bold text-app-primary">{{ pkg.volume }} m³</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em]">Valeur déclarée</span>
                <span class="text-[14px] font-bold text-app-primary">{{ currencyStore.formatAmount(pkg.declared_value) }}</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em]">Fragilité</span>
                <span class="text-[14px] font-bold text-app-primary">{{ fragilityLabel }}</span>
              </div>
              <div class="flex flex-col gap-0.5">
                <span class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em]">Créé le</span>
                <span class="text-[14px] font-bold text-app-primary">{{ formatDate(pkg.creation_date) }}</span>
              </div>
            </div>

            <!-- Prix -->
            <div v-if="displayPrice" class="pt-3 border-t border-[var(--glass-border)]">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em]">
                  {{ displayPrice.confirmed ? 'Prix du voyage' : 'Prix estimé' }}
                </span>
                <span v-if="!displayPrice.confirmed" class="text-[10px] text-amber-400 font-semibold">En attente de validation</span>
              </div>
              <p class="text-[22px] font-extrabold mt-1" :class="displayPrice.confirmed ? 'text-app-primary' : 'text-amber-400'">
                {{ currencyStore.formatAmount(displayPrice.value) }}
              </p>
              <p v-if="!displayPrice.confirmed" class="text-[11px] text-app-faint mt-0.5">
                Calculé d'après le tarif du voyage · Peut varier légèrement
              </p>
            </div>

            <div v-if="pkg.special_instructions" class="pt-3 border-t border-[var(--glass-border)] flex flex-col gap-1">
              <span class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em]">Instructions spéciales</span>
              <p class="text-[13px] text-app-muted italic leading-snug">{{ pkg.special_instructions }}</p>
            </div>
          </div>

          <!-- RECIPIENT SECTION -->
          <div v-if="recipient" class="glass rounded-[20px] p-4 flex flex-col gap-3">
            <p class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em]">Destinataire</p>
            <div class="flex items-center gap-3.5">
              <div class="w-11 h-11 rounded-full bg-gradient-to-br from-[var(--primary-30)] to-[var(--primary-15)] border border-[var(--primary-30)] flex items-center justify-center text-sm font-bold text-[var(--primary)] shrink-0">
                {{ recipient.first_name[0] }}{{ recipient.last_name[0] }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[15px] font-semibold text-app-primary truncate">{{ recipient.first_name }} {{ recipient.last_name }}</p>
                <p class="text-[13px] text-app-muted truncate">{{ recipient.phone }}</p>
                <p class="text-[12px] text-app-faint truncate">{{ recipient.city }}, {{ recipient.country }}</p>
              </div>
            </div>
          </div>

          <!-- TRAVEL SECTION -->
          <div v-if="travel" class="glass rounded-[20px] p-4 flex flex-col gap-3">
            <p class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em]">Voyage</p>
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2.5">
                <!-- Transport icon -->
                <div class="w-9 h-9 rounded-full bg-white/[0.06] border border-[var(--glass-border)] flex items-center justify-center shrink-0">
                  <svg v-if="travel.transport_type === 'ship'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="text-app-muted">
                    <path d="M2 21c.6.5 1.2 1 2.5 1C7 22 7 21 9.5 21s2.5 1 5 1 2.5-1 5-1c1.3 0 1.9.5 2.5 1"/>
                    <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/>
                    <path d="M19 13V7a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v6"/>
                    <path d="M12 10v4"/>
                    <path d="M12 2v3"/>
                  </svg>
                  <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="text-app-muted">
                    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 4H6L4 2 2 2v2l2 2-3 7 2.8.6"/>
                    <path d="M15 15l-5.4-5.4"/>
                    <path d="M5 19 7 21"/>
                    <path d="M19 19l2 2"/>
                  </svg>
                </div>
                <div>
                  <div class="flex items-center gap-1.5 text-[15px] font-semibold text-app-primary">
                    <span>{{ travel.origin.name }}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-app-faint">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                    <span>{{ travel.destination.name }}</span>
                  </div>
                  <p class="text-[12px] text-app-muted">{{ transportLabel }}</p>
                </div>
              </div>
              <StatusBadge :status="travel.status" />
            </div>
            <div v-if="travel.departure_date" class="flex items-center gap-1.5 text-[13px] text-app-muted pt-2 border-t border-[var(--glass-border)]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-app-faint shrink-0">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>Départ : <strong class="text-app-primary">{{ formatDate(travel.departure_date) }}</strong></span>
            </div>
            <!-- Pending validation banner -->
            <div v-if="pkg.status === 'pending'" class="flex items-center gap-2 px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-[10px]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-400 shrink-0">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span class="text-[12px] text-amber-400 leading-snug">En attente de validation par le transitaire</span>
            </div>
          </div>

          <!-- No travel assigned -->
          <div v-else-if="pkg.travel_id === null" class="glass-subtle rounded-[20px] p-4 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2 text-sm text-app-muted">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-app-faint shrink-0">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>Aucun voyage assigné</span>
            </div>
            <button
              v-if="canSubmit"
              @click="openVoyageSheet"
              class="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold text-[var(--primary)] bg-[var(--primary-10)] border border-[var(--primary-25)] cursor-pointer transition-colors active:bg-[var(--primary-20)]"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Soumettre
            </button>
          </div>

          <!-- EDIT BUTTON -->
          <button
            v-if="canEdit"
            @click="showEditSheet = true"
            class="w-full flex items-center justify-center gap-2 py-[14px] rounded-[20px] glass border-[1.5px] border-[var(--primary-30)] text-[var(--primary)] text-[15px] font-semibold cursor-pointer transition-colors active:bg-[var(--primary-10)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Modifier le colis
          </button>

          <!-- CANCEL BUTTON -->
          <button
            v-if="canCancel"
            @click="showCancelDialog = true"
            class="w-full flex items-center justify-center gap-2 py-[14px] rounded-[20px] bg-[rgba(239,68,68,0.1)] border-[1.5px] border-[rgba(239,68,68,0.25)] text-red-400 text-[15px] font-semibold cursor-pointer transition-colors active:bg-[rgba(239,68,68,0.18)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            {{ isWithdrawing ? 'Retirer la soumission' : 'Annuler le colis' }}
          </button>

        </div>
      </template>

      <!-- PAYMENT SHEET -->
      <PaymentSheet
        v-if="pkg"
        v-model="showPaymentSheet"
        :package-id="packageId"
        :amount-usd="pkg.price ?? 0"
        :deadline-at="pkg.payment?.deadline_at ?? ''"
        @paid="fetchData"
      />

      <!-- VOYAGE SELECTION SHEET -->
      <Teleport to="body">
        <Transition name="fade">
          <div
            v-if="showVoyageSheet"
            class="overlay flex items-end md:items-center justify-center"
            @click.self="showVoyageSheet = false"
          >
            <Transition name="slide-up">
              <div v-if="showVoyageSheet" class="sheet w-full max-w-[480px] md:rounded-3xl rounded-t-3xl flex flex-col" style="max-height: 88dvh;">
                <div class="w-9 h-1 bg-[var(--primary-30)] rounded-full mx-auto mt-4 shrink-0" />
                <div class="flex items-center justify-between px-5 py-4 shrink-0">
                  <h2 class="text-[17px] font-extrabold text-app-primary">Choisir un voyage</h2>
                  <button
                    class="w-8 h-8 rounded-full glass flex items-center justify-center text-app-muted cursor-pointer border-none text-lg leading-none"
                    @click="showVoyageSheet = false"
                  >×</button>
                </div>
                <div class="border-t border-[var(--glass-border)] shrink-0" />

                <div class="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
                  <!-- Loading -->
                  <div v-if="voyagesLoading" class="flex flex-col gap-3">
                    <div v-for="i in 3" :key="i" class="skeleton h-[80px] rounded-[16px]" />
                  </div>

                  <!-- Empty -->
                  <div v-else-if="availableVoyages.length === 0" class="py-10 text-center flex flex-col items-center gap-2 text-app-muted">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="opacity-30">
                      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                    <p class="text-sm font-semibold text-app-primary">Aucun voyage disponible</p>
                    <p class="text-[13px]">Il n'y a aucun voyage ouvert pour le moment.</p>
                  </div>

                  <!-- Voyage list -->
                  <button
                    v-else
                    v-for="v in availableVoyages"
                    :key="v.travel_id"
                    class="glass-subtle rounded-[16px] p-4 flex items-center gap-3 w-full text-left cursor-pointer border border-[var(--glass-border)] transition-colors active:bg-[var(--primary-10)] disabled:opacity-60"
                    :disabled="submitLoading !== null"
                    @click="handleSubmit(v.travel_id)"
                  >
                    <!-- Transport icon -->
                    <div class="w-10 h-10 rounded-[10px] bg-[var(--primary-15)] border border-[var(--primary-25)] flex items-center justify-center text-[var(--primary)] shrink-0">
                      <svg v-if="v.transport_type === 'ship'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M2 21c.6.5 1.2 1 2.5 1C7 22 7 20 9.5 20c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
                        <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/>
                        <path d="M19 13V7a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v6"/>
                        <path d="M12 10v4"/><path d="M12 2v3"/>
                      </svg>
                      <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 4H6L4 2 2 2v2l2 2-3 7 2.8.6"/>
                        <path d="M15 15l-5.4-5.4"/>
                        <path d="M5 19 7 21"/><path d="M19 19l2 2"/>
                      </svg>
                    </div>
                    <!-- Info -->
                    <div class="flex-1 min-w-0">
                      <p class="text-[14px] font-bold text-app-primary truncate">{{ v.origin.name }} → {{ v.destination.name }}</p>
                      <p class="text-[12px] text-app-muted">{{ formatDeparture(v.departure_date) }} · {{ v.packages_count }} colis</p>
                    </div>
                    <!-- Spinner or arrow -->
                    <div class="shrink-0">
                      <svg v-if="submitLoading === v.travel_id" class="animate-spin text-[var(--primary)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-app-faint">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </Transition>
      </Teleport>

      <!-- EDIT SHEET -->
      <PackageFormSheet
        v-model="showEditSheet"
        mode="edit"
        :loading="editLoading"
        :error="editError"
        :initial-values="editInitialValues"
        @submit="handleEditSubmit"
      />

      <!-- CANCEL CONFIRMATION DIALOG -->
      <Teleport to="body">
        <Transition name="fade">
          <div
            v-if="showCancelDialog"
            class="overlay flex items-center justify-center px-6"
            @click.self="showCancelDialog = false"
          >
            <Transition name="scale-up">
              <div v-if="showCancelDialog" class="glass rounded-[24px] p-6 w-full max-w-[360px] flex flex-col gap-4">
                <!-- Icon -->
                <div class="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-400">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                </div>

                <div class="text-center flex flex-col gap-1.5">
                  <h2 class="text-[17px] font-bold text-app-primary">
                    {{ isWithdrawing ? 'Retirer la soumission ?' : 'Annuler le colis ?' }}
                  </h2>
                  <p class="text-[14px] text-app-muted leading-snug">
                    {{ isWithdrawing
                      ? 'Le groupeur ne pourra plus valider ce colis. Il repassera en attente et vous pourrez le resoumettre.'
                      : 'Cette action est irréversible. Le colis sera définitivement annulé.' }}
                  </p>
                </div>

                <div class="flex flex-col gap-2.5">
                  <button
                    @click="handleCancel"
                    :disabled="cancelLoading"
                    class="w-full flex items-center justify-center gap-2 py-[13px] rounded-[14px] bg-red-500 text-white text-[15px] font-semibold cursor-pointer transition-opacity active:opacity-80 border-none disabled:opacity-60"
                  >
                    <span v-if="cancelLoading" class="btn-spinner border-white/40 border-t-white" />
                    <span v-else>{{ isWithdrawing ? 'Retirer la soumission' : 'Confirmer l\'annulation' }}</span>
                  </button>
                  <button
                    @click="showCancelDialog = false"
                    :disabled="cancelLoading"
                    class="w-full flex items-center justify-center py-[13px] rounded-[14px] bg-transparent border border-[var(--glass-border)] text-app-muted text-[15px] font-medium cursor-pointer transition-colors hover:text-app-primary hover:border-[var(--primary-30)] disabled:opacity-60"
                  >
                    Retour
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </Transition>
      </Teleport>

    </div>
  </AppLayout>
</template>

<style scoped>
.scale-up-enter-active,
.scale-up-leave-active {
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.15s ease;
}
.scale-up-enter-from,
.scale-up-leave-to {
  transform: scale(0.92);
  opacity: 0;
}
</style>
