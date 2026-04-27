<script setup lang="ts">
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import ModalSheet from '@/components/common/ModalSheet.vue'
import AppButton from '@/components/common/AppButton.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import ImagePicker from '@/components/common/ImagePicker.vue'
import PhoneInput from '@/components/common/PhoneInput.vue'
import { Package as PackageIcon, AlertTriangle, ShieldAlert } from 'lucide-vue-next'
import { recipientsApi } from '@/api/recipients'
import { travelsApi } from '@/api/travels'
import type { Recipient, Travel } from '@/types'

export interface PackageFormPayload {
  description: string
  weight: string
  volume: string
  declared_value: string
  fragility: 'normal' | 'fragile' | 'tres_fragile'
  special_instructions: string
  recipient_id: number
  travel_id: number | null
  imgFiles: (File | null)[]
  imgRemoved: boolean[]
}

export interface PackageFormInitialValues {
  description: string
  weight: string
  volume: string
  declared_value: string
  special_instructions: string
  selectedRecipient: Recipient | null
  existingImages: (string | null)[]
}

const props = defineProps<{
  mode: 'create' | 'edit'
  loading: boolean
  error: string
  initialValues?: PackageFormInitialValues
}>()

const emit = defineEmits<{
  submit: [payload: PackageFormPayload]
}>()

const open = defineModel<boolean>({ required: true })

// Step (create mode only)
const step = ref(1)

// Basic fields
const form = reactive({
  description: '',
  weight: '',
  volume: '',
  declared_value: '',
  fragility: 'normal' as 'normal' | 'fragile' | 'tres_fragile',
  special_instructions: '',
})

// Recipients
const recipients = ref<Recipient[]>([])
const recipientsLoading = ref(false)
const selectedRecipient = ref<Recipient | null>(null)

// Inline new recipient (create mode only)
const showNewRecipient = ref(false)
const newRecipientLoading = ref(false)
const newRecipientError = ref('')
const newRecipientPhoneValid = ref(false)
const newRecipient = reactive({
  first_name: '', last_name: '', phone: '', email: '', address: '', city: '', country: '',
})

// Images
const imgFiles    = ref<(File | null)[]>([null, null, null, null])
const imgPreviews = ref<(string | null)[]>([null, null, null, null])
const imgRemoved  = ref<boolean[]>([false, false, false, false])
const existingImages = ref<(string | null)[]>([null, null, null, null])

const hasImage1 = computed(() =>
  !!imgFiles.value[0] ||
  (!imgRemoved.value[0] && !!existingImages.value[0])
)

function updateImgFile(i: number, file: File | null) {
  if (imgPreviews.value[i]) URL.revokeObjectURL(imgPreviews.value[i]!)
  imgFiles.value[i] = file
  imgPreviews.value[i] = file ? URL.createObjectURL(file) : null
}

onUnmounted(() => {
  imgPreviews.value.forEach(u => { if (u) URL.revokeObjectURL(u) })
})

// Travels (create mode only)
const travels = ref<Travel[]>([])
const selectedTravel = ref<Travel | null>(null)
const noTravel = ref(false)

// Validation
const step1Valid = computed(() =>
  form.description.trim() !== '' &&
  parseFloat(form.weight) > 0 &&
  parseFloat(form.volume) > 0 &&
  parseFloat(form.declared_value) >= 0,
)
const step2Valid = computed(() => selectedRecipient.value !== null && hasImage1.value)
const step3Valid = computed(() => selectedTravel.value !== null || noTravel.value)

// Reset + open
function reset() {
  step.value = 1
  form.description = ''
  form.weight = ''
  form.volume = ''
  form.declared_value = ''
  form.fragility = 'normal'
  form.special_instructions = ''
  selectedRecipient.value = null
  showNewRecipient.value = false
  newRecipientError.value = ''
  imgPreviews.value.forEach(u => { if (u) URL.revokeObjectURL(u) })
  imgFiles.value    = [null, null, null, null]
  imgPreviews.value = [null, null, null, null]
  imgRemoved.value  = [false, false, false, false]
  existingImages.value = [null, null, null, null]
  selectedTravel.value = null
  noTravel.value = false
}

watch(open, async (val) => {
  if (!val) return
  reset()
  if (props.mode === 'edit' && props.initialValues) {
    const v = props.initialValues
    form.description        = v.description
    form.weight             = v.weight
    form.volume             = v.volume
    form.declared_value     = v.declared_value
    form.special_instructions = v.special_instructions
    selectedRecipient.value = v.selectedRecipient
    existingImages.value    = [...v.existingImages]
  }
  recipientsLoading.value = true
  try {
    const fetches: Promise<void>[] = [
      recipientsApi.getAll().then(r => { recipients.value = r.data }),
    ]
    if (props.mode === 'create') {
      fetches.push(
        travelsApi.getAll({ status: 'open', limit: '200' }).then(r => { travels.value = r.data.data }),
      )
    }
    await Promise.all(fetches)
  } catch { /* non-blocking */ } finally {
    recipientsLoading.value = false
  }
})

// Wizard navigation
const stepError = ref('')

function nextStep() {
  stepError.value = ''
  if (step.value === 1 && !step1Valid.value) {
    stepError.value = 'Veuillez remplir tous les champs obligatoires.'
    return
  }
  if (step.value === 2 && !step2Valid.value) {
    stepError.value = 'Veuillez choisir un destinataire et ajouter au moins une photo.'
    return
  }
  if (step.value < 4) step.value++
}

function prevStep() {
  stepError.value = ''
  if (step.value > 1) step.value--
}

function selectTravel(t: Travel) { selectedTravel.value = t; noTravel.value = false }
function skipTravel()             { selectedTravel.value = null; noTravel.value = true }

// New recipient
function openNewRecipient() {
  newRecipient.first_name = ''; newRecipient.last_name = ''; newRecipient.phone = ''
  newRecipient.email = ''; newRecipient.address = ''; newRecipient.city = ''; newRecipient.country = ''
  newRecipientError.value = ''
  newRecipientPhoneValid.value = false
  showNewRecipient.value = true
}

async function saveNewRecipient() {
  newRecipientError.value = ''
  if (!newRecipient.first_name || !newRecipient.last_name || !newRecipient.phone ||
      !newRecipient.address || !newRecipient.city || !newRecipient.country) {
    newRecipientError.value = 'Veuillez remplir tous les champs obligatoires.'
    return
  }
  if (!newRecipientPhoneValid.value) {
    newRecipientError.value = 'Veuillez entrer un numéro de téléphone valide.'
    return
  }
  newRecipientLoading.value = true
  try {
    const { data } = await recipientsApi.create({
      first_name: newRecipient.first_name,
      last_name:  newRecipient.last_name,
      phone:      newRecipient.phone,
      email:      newRecipient.email || null,
      address:    newRecipient.address,
      city:       newRecipient.city,
      country:    newRecipient.country,
    })
    recipients.value.push(data)
    selectedRecipient.value = data
    showNewRecipient.value = false
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    newRecipientError.value = e.response?.data?.message ?? 'Erreur lors de la création du destinataire.'
  } finally {
    newRecipientLoading.value = false
  }
}

// Submit
function doSubmit() {
  emit('submit', {
    description:        form.description,
    weight:             form.weight,
    volume:             form.volume,
    declared_value:     form.declared_value,
    fragility:          form.fragility,
    special_instructions: form.special_instructions,
    recipient_id:       selectedRecipient.value!.recipient_id,
    travel_id:          selectedTravel.value?.travel_id ?? null,
    imgFiles:           [...imgFiles.value],
    imgRemoved:         [...imgRemoved.value],
  })
}

// Helpers
function formatDateShort(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

const stepTitle = computed(() => {
  if (step.value === 1) return 'Informations'
  if (step.value === 2) return 'Destinataire & Photos'
  if (step.value === 3) return 'Choisir un voyage'
  return 'Récapitulatif'
})
</script>

<template>
  <ModalSheet v-model="open" :title="mode === 'edit' ? 'Modifier le colis' : undefined">

    <!-- Wizard header (create mode) -->
    <template v-if="mode === 'create'" #header>
      <div class="flex items-center gap-3">
        <button
          v-if="step > 1"
          class="w-8 h-8 rounded-full glass flex items-center justify-center text-app-muted cursor-pointer border-none"
          @click="prevStep"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2 class="text-[17px] font-bold text-app-primary">{{ stepTitle }}</h2>
      </div>
    </template>

    <!-- Step dots (create mode) -->
    <div v-if="mode === 'create'" class="flex items-center justify-center gap-1.5 pt-4 px-5">
      <div
        v-for="i in 4"
        :key="i"
        class="h-1.5 rounded-full transition-all duration-300"
        :class="i === step ? 'w-6 bg-[var(--primary)]' : i < step ? 'w-3 bg-[var(--primary-50)]' : 'w-3 bg-white/15'"
      />
    </div>

    <div class="px-5 pb-5 pt-4 flex flex-col gap-3.5">

      <!-- ══════════════════════════════════════════════════════════
           STEP 1 (create) / Basic fields (edit)
      ══════════════════════════════════════════════════════════ -->
      <template v-if="mode === 'edit' || step === 1">

        <div class="flex flex-col gap-1.5">
          <label class="field-label">Description *</label>
          <input v-model="form.description" type="text" class="input-field" placeholder="Ex: Vêtements, électronique..." :disabled="loading" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="field-label">Poids (kg) *</label>
            <input v-model="form.weight" type="number" step="0.1" min="0.01" class="input-field" placeholder="0.0" :disabled="loading" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="field-label">Volume (m³) *</label>
            <input v-model="form.volume" type="number" step="0.001" min="0.001" class="input-field" placeholder="0.000" :disabled="loading" />
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="field-label">Valeur déclarée (€) *</label>
          <input v-model="form.declared_value" type="number" min="0" class="input-field" placeholder="0" :disabled="loading" />
        </div>

        <!-- Fragilité (create only) -->
        <div v-if="mode === 'create'" class="flex flex-col gap-1.5">
          <label class="field-label">Fragilité *</label>
          <div class="grid grid-cols-3 gap-2">
            <button type="button"
              class="flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-[12px] border-[1.5px] text-[12px] font-semibold transition-all cursor-pointer"
              :class="form.fragility === 'normal' ? 'bg-[var(--primary-10)] border-[var(--primary)] text-[var(--primary)]' : 'bg-transparent border-[var(--glass-border)] text-app-muted'"
              @click="form.fragility = 'normal'"
            ><PackageIcon :size="18" />Normal</button>
            <button type="button"
              class="flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-[12px] border-[1.5px] text-[12px] font-semibold transition-all cursor-pointer"
              :class="form.fragility === 'fragile' ? 'bg-[var(--primary-10)] border-[var(--primary)] text-[var(--primary)]' : 'bg-transparent border-[var(--glass-border)] text-app-muted'"
              @click="form.fragility = 'fragile'"
            ><AlertTriangle :size="18" />Fragile</button>
            <button type="button"
              class="flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-[12px] border-[1.5px] text-[12px] font-semibold transition-all cursor-pointer"
              :class="form.fragility === 'tres_fragile' ? 'bg-[var(--primary-10)] border-[var(--primary)] text-[var(--primary)]' : 'bg-transparent border-[var(--glass-border)] text-app-muted'"
              @click="form.fragility = 'tres_fragile'"
            ><ShieldAlert :size="18" />Très fragile</button>
          </div>
          <p class="text-[11px] text-app-faint">Les colis fragiles entraînent un supplément de prix.</p>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="field-label">Instructions spéciales</label>
          <textarea
            v-model="form.special_instructions"
            class="input-field"
            style="min-height: 72px; resize: none;"
            placeholder="Fragile, température contrôlée..."
            :disabled="loading"
          />
        </div>

        <template v-if="mode === 'create'">
          <ErrorAlert :message="stepError" />
          <AppButton :full="true" @click="nextStep">Suivant</AppButton>
        </template>
      </template>

      <!-- ══════════════════════════════════════════════════════════
           STEP 2 (create) / Recipient + images (edit)
      ══════════════════════════════════════════════════════════ -->
      <template v-if="mode === 'edit' || step === 2">

        <!-- Images -->
        <div class="flex flex-col gap-1.5" :class="mode === 'edit' ? '' : 'order-last'">
          <label class="field-label">Photos du colis {{ mode === 'create' ? '*' : '' }}</label>
          <p class="text-xs text-app-muted -mt-0.5">La première photo est obligatoire.</p>
          <div class="grid grid-cols-2 gap-2.5">
            <ImagePicker
              v-for="i in 4"
              :key="i"
              :model-value="imgFiles[i - 1]"
              :existing="mode === 'edit' ? existingImages[i - 1] : undefined"
              :required="i === 1"
              :label="`Photo ${i}${i === 1 ? ' *' : ''}`"
              :disabled="loading"
              @update:model-value="updateImgFile(i - 1, $event)"
              @remove="imgRemoved[i - 1] = true"
            />
          </div>
        </div>

        <!-- Recipient -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <label class="field-label">Destinataire *</label>
            <button
              v-if="mode === 'create' && !showNewRecipient"
              type="button"
              class="flex items-center gap-1 text-xs font-semibold text-[var(--primary)] cursor-pointer bg-transparent border-none p-0 transition-opacity hover:opacity-70"
              @click="openNewRecipient"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nouveau
            </button>
          </div>

          <!-- Inline new recipient form (create mode) -->
          <div v-if="showNewRecipient" class="flex flex-col gap-2.5 p-3.5 glass-subtle rounded-[14px] border border-[var(--primary-30)]">
            <div class="flex items-center justify-between mb-0.5">
              <p class="text-sm font-semibold text-app-primary">Nouveau destinataire</p>
              <button type="button" class="w-6 h-6 rounded-full glass flex items-center justify-center text-app-muted cursor-pointer border-none text-base leading-none" @click="showNewRecipient = false">×</button>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <input v-model="newRecipient.first_name" type="text" class="input-field" placeholder="Prénom *" :disabled="newRecipientLoading" />
              <input v-model="newRecipient.last_name" type="text" class="input-field" placeholder="Nom *" :disabled="newRecipientLoading" />
            </div>
            <PhoneInput v-model="newRecipient.phone" placeholder="Téléphone *" :disabled="newRecipientLoading" @valid="newRecipientPhoneValid = $event" />
            <input v-model="newRecipient.email" type="email" class="input-field" placeholder="Email (optionnel)" :disabled="newRecipientLoading" />
            <input v-model="newRecipient.address" type="text" class="input-field" placeholder="Adresse *" :disabled="newRecipientLoading" />
            <div class="grid grid-cols-2 gap-2">
              <input v-model="newRecipient.city" type="text" class="input-field" placeholder="Ville *" :disabled="newRecipientLoading" />
              <input v-model="newRecipient.country" type="text" class="input-field" placeholder="Pays *" :disabled="newRecipientLoading" />
            </div>
            <div v-if="newRecipientError" class="text-[12px] text-red-400 px-1">{{ newRecipientError }}</div>
            <div class="flex gap-2 pt-1">
              <button type="button" class="flex-1 py-2 rounded-[10px] text-sm font-semibold text-app-muted border border-[var(--glass-border)] bg-transparent cursor-pointer transition-colors hover:text-app-primary" :disabled="newRecipientLoading" @click="showNewRecipient = false">Annuler</button>
              <AppButton :loading="newRecipientLoading" loading-text="Création..." class="flex-1" @click="saveNewRecipient">Créer</AppButton>
            </div>
          </div>

          <!-- Recipient list -->
          <template v-else>
            <div v-if="recipientsLoading" class="flex flex-col gap-2">
              <div v-for="i in 2" :key="i" class="skeleton h-[58px] rounded-[14px]" />
            </div>
            <div v-else-if="recipients.length === 0" class="text-sm text-app-muted text-center py-4">
              Aucun destinataire.<span v-if="mode === 'create'"> Créez-en un avec le bouton <strong>Nouveau</strong>.</span>
            </div>
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
          </template>
        </div>

        <template v-if="mode === 'create'">
          <ErrorAlert :message="stepError" />
          <AppButton :full="true" @click="nextStep">Suivant</AppButton>
        </template>

        <!-- Edit mode: error + submit -->
        <template v-if="mode === 'edit'">
          <ErrorAlert :message="error" />
          <AppButton :full="true" :loading="loading" loading-text="Enregistrement..." @click="doSubmit">
            Enregistrer les modifications
          </AppButton>
        </template>
      </template>

      <!-- ══════════════════════════════════════════════════════════
           STEP 3: Travel selection (create mode only)
      ══════════════════════════════════════════════════════════ -->
      <template v-if="mode === 'create' && step === 3">
        <!-- Skip option -->
        <div
          class="flex items-center gap-3 px-3.5 py-3 rounded-[14px] cursor-pointer transition-all border"
          :class="noTravel ? 'bg-[var(--primary-15)] border-[var(--primary)]' : 'glass-subtle border-transparent'"
          @click="skipTravel"
        >
          <div class="w-9 h-9 rounded-full bg-white/[0.08] border border-[var(--glass-border)] flex items-center justify-center text-app-muted shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/>
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

        <div
          v-for="t in travels"
          :key="t.travel_id"
          class="rounded-[16px] p-4 cursor-pointer transition-all border flex flex-col gap-3"
          :class="selectedTravel?.travel_id === t.travel_id ? 'bg-[var(--primary-15)] border-[var(--primary)]' : 'glass-subtle border-transparent'"
          @click="selectTravel(t)"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-white/[0.08] border border-[var(--glass-border)] flex items-center justify-center text-app-muted shrink-0">
                <svg v-if="t.transport_type === 'ship'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
                  <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.3.6 4.3 1.62 6"/>
                  <path d="M12 10V2"/><path d="M8 6l4-4 4 4"/>
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19 4c-1 0-2 .5-2.5 1L13 9 4.8 6.2c-.5-.2-1.1.1-1.3.6L2 8.7c-.2.5 0 1.1.4 1.4L6.5 13l-2 2H2l-1 1 3 3 1-1v-2l2-2 3.5 4c.3.4.9.6 1.4.4l2.1-1.5c.5-.2.8-.8.6-1.3z"/>
                </svg>
              </div>
              <div>
                <p class="text-sm font-bold text-app-primary">{{ t.origin.name }} → {{ t.destination.name }}</p>
                <p class="text-xs text-app-muted">{{ t.transport_type === 'ship' ? 'Maritime' : 'Aérien' }}</p>
              </div>
            </div>
            <div v-if="selectedTravel?.travel_id === t.travel_id" class="w-5 h-5 rounded-full bg-[var(--primary)] flex items-center justify-center shrink-0">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </div>
          <div class="flex items-center gap-3 text-xs text-app-muted">
            <span>Départ : <strong class="text-app-primary">{{ formatDateShort(t.departure_date) }}</strong></span>
            <span>·</span>
            <span>Arrivée : <strong class="text-app-primary">{{ formatDateShort(t.estimated_arrival_date) }}</strong></span>
          </div>
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

        <AppButton :full="true" class="mt-1" :disabled="!step3Valid" @click="nextStep">Suivant</AppButton>
      </template>

      <!-- ══════════════════════════════════════════════════════════
           STEP 4: Recap (create mode only)
      ══════════════════════════════════════════════════════════ -->
      <template v-if="mode === 'create' && step === 4">
        <div class="glass-subtle rounded-[16px] p-4 flex flex-col gap-2">
          <p class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.05em]">Colis</p>
          <p class="text-sm font-semibold text-app-primary">{{ form.description }}</p>
          <div class="flex gap-3 text-xs text-app-muted">
            <span>{{ form.weight }} kg</span><span>·</span>
            <span>{{ form.volume }} m³</span><span>·</span>
            <span>{{ form.declared_value }} €</span>
          </div>
          <p v-if="form.special_instructions" class="text-xs text-app-muted italic">{{ form.special_instructions }}</p>
        </div>

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

        <div class="glass-subtle rounded-[16px] p-4 flex flex-col gap-1">
          <p class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.05em]">Voyage</p>
          <template v-if="selectedTravel">
            <p class="text-sm font-semibold text-app-primary">{{ selectedTravel.origin.name }} → {{ selectedTravel.destination.name }}</p>
            <p class="text-xs text-app-muted">{{ selectedTravel.transport_type === 'ship' ? 'Maritime' : 'Aérien' }} · Départ {{ formatDateShort(selectedTravel.departure_date) }}</p>
          </template>
          <p v-else class="text-sm text-app-muted">Aucun voyage — colis en attente</p>
        </div>

        <div v-if="imgPreviews.filter(Boolean).length > 0" class="flex flex-col gap-2">
          <p class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.05em]">Photos</p>
          <div class="flex gap-2">
            <div
              v-for="(url, idx) in imgPreviews.filter(Boolean)"
              :key="idx"
              class="w-16 h-16 rounded-[10px] overflow-hidden border border-[var(--glass-border)] shrink-0"
            >
              <img :src="url!" class="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        <ErrorAlert :message="error" />

        <AppButton :full="true" :loading="loading" loading-text="Création..." @click="doSubmit">
          Confirmer et créer le colis
        </AppButton>
      </template>

    </div>
  </ModalSheet>
</template>

<style scoped>
.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
