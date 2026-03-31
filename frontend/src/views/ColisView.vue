<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { packagesApi } from '@/api/packages'
import { recipientsApi } from '@/api/recipients'
import { travelsApi } from '@/api/travels'
import type { Package, Recipient, Travel } from '@/types'

// ─── List state ────────────────────────────────────────────────────────────
const packages = ref<Package[]>([])
const loading = ref(true)
const error = ref('')

// ─── Sheet / wizard state ───────────────────────────────────────────────────
const showSheet = ref(false)
const step = ref(1)
const formLoading = ref(false)
const formError = ref('')

// Step 1 — basic info
const form = reactive({
  description: '',
  weight: '',
  volume: '',
  declared_value: '',
  special_instructions: '',
})

// Step 2 — recipient + images
const recipients = ref<Recipient[]>([])
const selectedRecipient = ref<Recipient | null>(null)
const images = ref<(File | null)[]>([null, null, null, null])
const previews = computed(() =>
  images.value.map((f) => (f ? URL.createObjectURL(f) : null)),
)

// Step 3 — travel
const travels = ref<Travel[]>([])
const selectedTravel = ref<Travel | null>(null)
const noTravel = ref(false)

// ─── Validation ─────────────────────────────────────────────────────────────
const step1Valid = computed(
  () =>
    form.description.trim() &&
    parseFloat(form.weight) > 0 &&
    parseFloat(form.volume) > 0 &&
    parseFloat(form.declared_value) >= 0,
)
const step2Valid = computed(() => selectedRecipient.value !== null && images.value[0] !== null)
const step3Valid = computed(() => selectedTravel.value !== null || noTravel.value)

// ─── Data fetch ─────────────────────────────────────────────────────────────
async function fetchPackages() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await packagesApi.getAll()
    packages.value = data
  } catch {
    error.value = 'Impossible de charger les colis.'
  } finally {
    loading.value = false
  }
}

async function fetchFormData() {
  try {
    const [recRes, travRes] = await Promise.all([
      recipientsApi.getAll(),
      travelsApi.getAll({ status: 'open' }),
    ])
    recipients.value = recRes.data
    travels.value = travRes.data
  } catch {
    // non-blocking
  }
}

// ─── Image handling ──────────────────────────────────────────────────────────
function handleImagePick(index: number, event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  // Revoke previous object URL to avoid memory leaks
  if (images.value[index]) {
    URL.revokeObjectURL(previews.value[index]!)
  }
  images.value[index] = file
}

function removeImage(index: number) {
  if (images.value[index]) {
    URL.revokeObjectURL(previews.value[index]!)
    images.value[index] = null
  }
}

onUnmounted(() => {
  previews.value.forEach((url) => { if (url) URL.revokeObjectURL(url) })
})

// ─── Wizard navigation ───────────────────────────────────────────────────────
function openSheet() {
  resetForm()
  showSheet.value = true
  fetchFormData()
}

function resetForm() {
  step.value = 1
  form.description = ''
  form.weight = ''
  form.volume = ''
  form.declared_value = ''
  form.special_instructions = ''
  selectedRecipient.value = null
  images.value = [null, null, null, null]
  selectedTravel.value = null
  noTravel.value = false
  formError.value = ''
  formLoading.value = false
}

function nextStep() {
  formError.value = ''
  if (step.value === 1 && !step1Valid.value) {
    formError.value = 'Veuillez remplir tous les champs obligatoires.'
    return
  }
  if (step.value === 2 && !step2Valid.value) {
    formError.value = 'Veuillez choisir un destinataire et ajouter au moins une photo.'
    return
  }
  if (step.value < 4) step.value++
}

function prevStep() {
  formError.value = ''
  if (step.value > 1) step.value--
}

function selectTravel(t: Travel) {
  selectedTravel.value = t
  noTravel.value = false
}

function skipTravel() {
  selectedTravel.value = null
  noTravel.value = true
}

// ─── Submit ──────────────────────────────────────────────────────────────────
async function handleSubmit() {
  formError.value = ''
  formLoading.value = true
  try {
    const fd = new FormData()
    fd.append('description', form.description)
    fd.append('weight', form.weight)
    fd.append('volume', form.volume)
    fd.append('declared_value', form.declared_value)
    if (form.special_instructions) fd.append('special_instructions', form.special_instructions)
    fd.append('recipient_id', String(selectedRecipient.value!.recipient_id))
    if (selectedTravel.value) fd.append('travel_id', String(selectedTravel.value.travel_id))
    images.value.forEach((file, i) => {
      if (file) fd.append(`image${i + 1}`, file)
    })
    await packagesApi.create(fd)
    showSheet.value = false
    resetForm()
    await fetchPackages()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    formError.value = e.response?.data?.message ?? 'Erreur lors de la création du colis.'
  } finally {
    formLoading.value = false
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateShort(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

onMounted(fetchPackages)
</script>

<template>
  <AppLayout>
    <div class="p-4 sm:p-6 lg:p-8 flex flex-col gap-4">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-extrabold text-app-primary tracking-tight">Colis</h1>
        <button
          class="w-9 h-9 rounded-full glass flex items-center justify-center text-app-muted transition-colors active:bg-[var(--glass-bg-hover)] cursor-pointer"
          @click="fetchPackages"
          :disabled="loading"
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

      <!-- Loading -->
      <div v-if="loading" class="flex flex-col gap-2.5">
        <div v-for="i in 4" :key="i" class="glass rounded-[20px] p-4">
          <div class="skeleton h-4 w-[55%]" />
          <div class="skeleton h-3 w-[35%] mt-1.5" />
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="flex flex-col items-center gap-3 py-12 px-6 text-center text-app-muted">
        <span class="text-5xl opacity-40">⚠️</span>
        <p class="font-semibold text-app-primary">Erreur</p>
        <p class="text-sm">{{ error }}</p>
        <button
          class="mt-3 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-[var(--primary)] border-[1.5px] border-[var(--primary)] bg-transparent transition-colors hover:bg-[var(--primary-10)] cursor-pointer"
          @click="fetchPackages"
        >
          Réessayer
        </button>
      </div>

      <!-- Empty -->
      <div v-else-if="packages.length === 0" class="flex flex-col items-center gap-3 py-12 px-6 text-center text-app-muted">
        <span class="text-5xl opacity-40">📦</span>
        <p class="font-semibold text-app-primary">Aucun colis</p>
        <p class="text-sm">Ajoutez votre premier colis en cliquant sur le bouton +.</p>
      </div>

      <!-- List -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <div
          v-for="pkg in packages"
          :key="pkg.package_id"
          class="glass rounded-[20px] p-4 flex flex-col gap-2"
        >
          <!-- Image thumbnail -->
          <div v-if="pkg.image1" class="w-full h-[140px] rounded-[12px] overflow-hidden bg-white/5">
            <img :src="pkg.image1" class="w-full h-full object-cover" :alt="pkg.description" />
          </div>

          <div class="flex items-center justify-between">
            <span class="text-[13px] font-bold text-[var(--primary)] font-mono tracking-[0.05em]">{{ pkg.tracking_number }}</span>
            <StatusBadge :status="pkg.status" />
          </div>

          <p class="text-sm font-medium text-app-primary">{{ pkg.description }}</p>

          <div class="flex items-center gap-2 flex-wrap">
            <div class="flex items-center gap-1 text-xs text-app-muted bg-white/5 border border-[var(--glass-border)] rounded-md px-2 py-0.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8V4m4 4V2m4 6V4m-10 4h12l1 9H5L6 8z"/></svg>
              {{ pkg.weight }} kg
            </div>
            <div class="flex items-center gap-1 text-xs text-app-muted bg-white/5 border border-[var(--glass-border)] rounded-md px-2 py-0.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              {{ pkg.volume }} m³
            </div>
            <div class="text-xs text-app-muted bg-white/5 border border-[var(--glass-border)] rounded-md px-2 py-0.5">
              {{ pkg.declared_value }} €
            </div>
          </div>

          <p class="text-[11px] text-app-faint">Créé le {{ formatDate(pkg.creation_date) }}</p>
        </div>
      </div>
    </div>

    <!-- FAB -->
    <button
      class="fixed bottom-22 sm:bottom-20 right-4 sm:right-6 lg:right-8 w-14 h-14 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] glow-primary shadow-[0_4px_16px_rgba(0,0,0,0.3)] flex items-center justify-center cursor-pointer z-50 border-none text-white transition-all active:scale-[0.93]"
      @click="openSheet"
      aria-label="Nouveau colis"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>

    <!-- Wizard Sheet -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showSheet" class="overlay flex items-end md:items-center justify-center" @click.self="showSheet = false">
          <Transition name="slide-up">
            <div v-if="showSheet" class="sheet w-full max-w-[480px] md:rounded-3xl rounded-t-3xl flex flex-col" style="max-height: 92dvh;">
              <!-- Handle -->
              <div class="w-9 h-1 bg-[var(--primary-30)] rounded-full mx-auto mt-4 shrink-0" />

              <!-- Sheet header -->
              <div class="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
                <div class="flex items-center gap-3">
                  <button
                    v-if="step > 1"
                    class="w-8 h-8 rounded-full glass flex items-center justify-center text-app-muted cursor-pointer"
                    @click="prevStep"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                  </button>
                  <h2 class="text-[17px] font-bold text-app-primary">
                    <span v-if="step === 1">Informations</span>
                    <span v-else-if="step === 2">Destinataire &amp; Photos</span>
                    <span v-else-if="step === 3">Choisir un voyage</span>
                    <span v-else>Récapitulatif</span>
                  </h2>
                </div>
                <button
                  class="w-8 h-8 rounded-full glass flex items-center justify-center text-app-muted cursor-pointer"
                  @click="showSheet = false"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <!-- Step indicators -->
              <div class="flex items-center justify-center gap-1.5 pb-4 shrink-0">
                <div
                  v-for="i in 4"
                  :key="i"
                  class="h-1.5 rounded-full transition-all duration-300"
                  :class="i === step ? 'w-6 bg-[var(--primary)]' : i < step ? 'w-3 bg-[var(--primary-50)]' : 'w-3 bg-white/15'"
                />
              </div>

              <!-- Scrollable content -->
              <div class="flex-1 overflow-y-auto px-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))]">

                <!-- ── Step 1: Basic info ── -->
                <div v-if="step === 1" class="flex flex-col gap-3.5">
                  <div class="flex flex-col gap-1.5">
                    <label class="field-label">Description *</label>
                    <input v-model="form.description" type="text" class="input-field" placeholder="Ex: Vêtements, électronique..." />
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1.5">
                      <label class="field-label">Poids (kg) *</label>
                      <input v-model="form.weight" type="number" step="0.1" min="0.01" class="input-field" placeholder="0.0" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                      <label class="field-label">Volume (m³) *</label>
                      <input v-model="form.volume" type="number" step="0.001" min="0.001" class="input-field" placeholder="0.00" />
                    </div>
                  </div>

                  <div class="flex flex-col gap-1.5">
                    <label class="field-label">Valeur déclarée (€) *</label>
                    <input v-model="form.declared_value" type="number" min="0" class="input-field" placeholder="0" />
                  </div>

                  <div class="flex flex-col gap-1.5">
                    <label class="field-label">Instructions spéciales</label>
                    <textarea
                      v-model="form.special_instructions"
                      class="input-field"
                      style="min-height: 80px; resize: none;"
                      placeholder="Fragile, température contrôlée..."
                    />
                  </div>

                  <Transition name="fade">
                    <div v-if="formError" class="px-3.5 py-2.5 bg-red-500/10 border border-red-500/25 rounded-[10px] text-[13px] text-red-400">{{ formError }}</div>
                  </Transition>

                  <button class="btn-primary w-full" @click="nextStep">
                    Suivant
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                </div>

                <!-- ── Step 2: Recipient + Images ── -->
                <div v-else-if="step === 2" class="flex flex-col gap-4">
                  <!-- Recipient -->
                  <div class="flex flex-col gap-2">
                    <label class="field-label">Destinataire *</label>
                    <div v-if="recipients.length === 0" class="text-sm text-app-muted text-center py-4">Aucun destinataire disponible.</div>
                    <div v-else class="flex flex-col gap-2 max-h-[200px] overflow-y-auto scrollbar-hide">
                      <div
                        v-for="r in recipients"
                        :key="r.recipient_id"
                        class="flex items-center gap-3 px-3.5 py-3 rounded-[14px] cursor-pointer transition-all border"
                        :class="selectedRecipient?.recipient_id === r.recipient_id
                          ? 'bg-[var(--primary-15)] border-[var(--primary)]'
                          : 'glass-subtle border-transparent'"
                        @click="selectedRecipient = r"
                      >
                        <div class="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--primary-30)] to-[var(--primary-15)] border border-[var(--primary-30)] flex items-center justify-center text-sm font-bold text-[var(--primary)] shrink-0">
                          {{ r.first_name[0] }}{{ r.last_name[0] }}
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-semibold text-app-primary truncate">{{ r.first_name }} {{ r.last_name }}</p>
                          <p class="text-xs text-app-muted">{{ r.city }}, {{ r.country }}</p>
                        </div>
                        <div v-if="selectedRecipient?.recipient_id === r.recipient_id" class="w-5 h-5 rounded-full bg-[var(--primary)] flex items-center justify-center shrink-0">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Images -->
                  <div class="flex flex-col gap-2">
                    <label class="field-label">Photos du colis *</label>
                    <p class="text-xs text-app-muted -mt-1">La première photo est obligatoire.</p>
                    <div class="grid grid-cols-2 gap-2.5">
                      <div
                        v-for="(_, idx) in images"
                        :key="idx"
                        class="relative aspect-square rounded-[14px] overflow-hidden border-2 transition-colors"
                        :class="idx === 0 && !images[0]
                          ? 'border-dashed border-red-400/50 bg-red-500/5'
                          : images[idx]
                          ? 'border-[var(--primary-50)] bg-transparent'
                          : 'border-dashed border-[var(--glass-border)] bg-white/[0.03]'"
                      >
                        <!-- Preview -->
                        <img
                          v-if="previews[idx]"
                          :src="previews[idx]!"
                          class="w-full h-full object-cover"
                        />

                        <!-- Placeholder -->
                        <div
                          v-else
                          class="absolute inset-0 flex flex-col items-center justify-center gap-1"
                        >
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-app-faint">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                          </svg>
                          <span class="text-[11px] text-app-faint">{{ idx === 0 ? 'Photo 1 *' : `Photo ${idx + 1}` }}</span>
                        </div>

                        <!-- Remove button -->
                        <button
                          v-if="images[idx]"
                          class="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white cursor-pointer border-none"
                          @click.prevent="removeImage(idx)"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>

                        <!-- Clickable input -->
                        <input
                          type="file"
                          accept="image/*"
                          class="absolute inset-0 opacity-0 cursor-pointer"
                          @change="handleImagePick(idx, $event)"
                        />
                      </div>
                    </div>
                  </div>

                  <Transition name="fade">
                    <div v-if="formError" class="px-3.5 py-2.5 bg-red-500/10 border border-red-500/25 rounded-[10px] text-[13px] text-red-400">{{ formError }}</div>
                  </Transition>

                  <button class="btn-primary w-full" @click="nextStep">
                    Suivant
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                </div>

                <!-- ── Step 3: Travel ── -->
                <div v-else-if="step === 3" class="flex flex-col gap-3">
                  <!-- Skip option -->
                  <div
                    class="flex items-center gap-3 px-3.5 py-3 rounded-[14px] cursor-pointer transition-all border"
                    :class="noTravel ? 'bg-[var(--primary-15)] border-[var(--primary)]' : 'glass-subtle border-transparent'"
                    @click="skipTravel"
                  >
                    <div class="w-9 h-9 rounded-full bg-white/[0.08] border border-[var(--glass-border)] flex items-center justify-center text-app-muted shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="8" y1="12" x2="16" y2="12"/>
                      </svg>
                    </div>
                    <div class="flex-1">
                      <p class="text-sm font-semibold text-app-primary">Aucun voyage pour l'instant</p>
                      <p class="text-xs text-app-muted">Le colis sera en attente</p>
                    </div>
                    <div v-if="noTravel" class="w-5 h-5 rounded-full bg-[var(--primary)] flex items-center justify-center shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  </div>

                  <div v-if="travels.length === 0" class="py-6 text-center text-sm text-app-muted">
                    Aucun voyage ouvert disponible.
                  </div>

                  <!-- Travel cards -->
                  <div
                    v-for="t in travels"
                    :key="t.travel_id"
                    class="rounded-[16px] p-4 cursor-pointer transition-all border flex flex-col gap-3"
                    :class="selectedTravel?.travel_id === t.travel_id
                      ? 'bg-[var(--primary-15)] border-[var(--primary)]'
                      : 'glass-subtle border-transparent'"
                    @click="selectTravel(t)"
                  >
                    <!-- Header row -->
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <!-- Transport icon -->
                        <div class="w-8 h-8 rounded-lg bg-white/[0.08] border border-[var(--glass-border)] flex items-center justify-center text-app-muted shrink-0">
                          <svg v-if="t.transport_type === 'ship'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
                            <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.3.6 4.3 1.62 6"/>
                            <path d="M12 10V2"/>
                            <path d="M8 6l4-4 4 4"/>
                          </svg>
                          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19 4c-1 0-2 .5-2.5 1L13 9 4.8 6.2c-.5-.2-1.1.1-1.3.6L2 8.7c-.2.5 0 1.1.4 1.4L6.5 13l-2 2H2l-1 1 3 3 1-1v-2l2-2 3.5 4c.3.4.9.6 1.4.4l2.1-1.5c.5-.2.8-.8.6-1.3z"/>
                          </svg>
                        </div>
                        <div>
                          <p class="text-sm font-bold text-app-primary">{{ t.origin_country }} → {{ t.destination_country }}</p>
                          <p class="text-xs text-app-muted">{{ t.transport_type === 'ship' ? 'Maritime' : 'Aérien' }}</p>
                        </div>
                      </div>
                      <div v-if="selectedTravel?.travel_id === t.travel_id" class="w-5 h-5 rounded-full bg-[var(--primary)] flex items-center justify-center shrink-0">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                    </div>

                    <!-- Dates -->
                    <div class="flex items-center gap-3 text-xs text-app-muted">
                      <span>Départ : <strong class="text-app-primary">{{ formatDateShort(t.departure_date) }}</strong></span>
                      <span>·</span>
                      <span>Arrivée : <strong class="text-app-primary">{{ formatDateShort(t.estimated_arrival_date) }}</strong></span>
                    </div>

                    <!-- Capacity bar -->
                    <div class="flex flex-col gap-1">
                      <div class="flex items-center justify-between text-[11px] text-app-muted">
                        <span>{{ t.transport_type === 'ship' ? 'Volume' : 'Poids' }}</span>
                        <span>{{ t.transport_type === 'ship' ? `${t.volume_fill_pct}%` : `${t.weight_fill_pct}%` }}</span>
                      </div>
                      <div class="h-1.5 rounded-full bg-white/[0.08]">
                        <div
                          class="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] transition-all"
                          :style="{ width: `${t.transport_type === 'ship' ? t.volume_fill_pct : t.weight_fill_pct}%` }"
                        />
                      </div>
                    </div>
                  </div>

                  <button class="btn-primary w-full mt-1" @click="nextStep" :disabled="!step3Valid">
                    Suivant
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                </div>

                <!-- ── Step 4: Summary ── -->
                <div v-else class="flex flex-col gap-3.5">
                  <!-- Package info -->
                  <div class="glass-subtle rounded-[16px] p-4 flex flex-col gap-2">
                    <p class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.05em]">Colis</p>
                    <p class="text-sm font-semibold text-app-primary">{{ form.description }}</p>
                    <div class="flex gap-3 text-xs text-app-muted">
                      <span>{{ form.weight }} kg</span>
                      <span>·</span>
                      <span>{{ form.volume }} m³</span>
                      <span>·</span>
                      <span>{{ form.declared_value }} €</span>
                    </div>
                    <p v-if="form.special_instructions" class="text-xs text-app-muted italic">{{ form.special_instructions }}</p>
                  </div>

                  <!-- Recipient -->
                  <div class="glass-subtle rounded-[16px] p-4 flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--primary-30)] to-[var(--primary-15)] border border-[var(--primary-30)] flex items-center justify-center text-sm font-bold text-[var(--primary)] shrink-0">
                      {{ selectedRecipient!.first_name[0] }}{{ selectedRecipient!.last_name[0] }}
                    </div>
                    <div>
                      <p class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.05em]">Destinataire</p>
                      <p class="text-sm font-semibold text-app-primary">{{ selectedRecipient!.first_name }} {{ selectedRecipient!.last_name }}</p>
                      <p class="text-xs text-app-muted">{{ selectedRecipient!.city }}, {{ selectedRecipient!.country }}</p>
                    </div>
                  </div>

                  <!-- Travel -->
                  <div class="glass-subtle rounded-[16px] p-4 flex flex-col gap-1">
                    <p class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.05em]">Voyage</p>
                    <template v-if="selectedTravel">
                      <p class="text-sm font-semibold text-app-primary">{{ selectedTravel.origin_country }} → {{ selectedTravel.destination_country }}</p>
                      <p class="text-xs text-app-muted">{{ selectedTravel.transport_type === 'ship' ? 'Maritime' : 'Aérien' }} · Départ {{ formatDateShort(selectedTravel.departure_date) }}</p>
                    </template>
                    <p v-else class="text-sm text-app-muted">Aucun voyage — colis en attente</p>
                  </div>

                  <!-- Images thumbnails -->
                  <div class="flex flex-col gap-2">
                    <p class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.05em]">Photos</p>
                    <div class="flex gap-2">
                      <div
                        v-for="(preview, idx) in previews.filter(Boolean)"
                        :key="idx"
                        class="w-16 h-16 rounded-[10px] overflow-hidden border border-[var(--glass-border)] shrink-0"
                      >
                        <img :src="preview!" class="w-full h-full object-cover" />
                      </div>
                    </div>
                  </div>

                  <Transition name="fade">
                    <div v-if="formError" class="px-3.5 py-2.5 bg-red-500/10 border border-red-500/25 rounded-[10px] text-[13px] text-red-400">{{ formError }}</div>
                  </Transition>

                  <button class="btn-primary w-full" @click="handleSubmit" :disabled="formLoading">
                    <span v-if="formLoading" class="btn-spinner" />
                    <span v-else>Confirmer et créer le colis</span>
                  </button>
                </div>

              </div><!-- end scrollable -->
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </AppLayout>
</template>

<style scoped>
.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.btn-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
