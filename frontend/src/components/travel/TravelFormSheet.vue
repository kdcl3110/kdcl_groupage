<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import ModalSheet from '@/components/common/ModalSheet.vue'
import SearchableSelect from '@/components/common/SearchableSelect.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import AppButton from '@/components/common/AppButton.vue'
import { countriesApi } from '@/api/countries'
import type { Country } from '@/types'

export interface TravelFormData {
  transport_type: 'ship' | 'plane'
  origin_country_id: string
  destination_country_id: string
  departure_date: string
  estimated_arrival_date: string
  max_weight: string
  max_volume: string
  price_per_unit: string
  itinerary: string
  container: string
  min_load_percentage: string
  max_load_percentage: string
}

const props = withDefaults(defineProps<{
  title: string
  submitLabel: string
  loadingText?: string
  loading: boolean
  error: string
  initialValues?: Partial<TravelFormData>
  minDepartureDate?: string
}>(), {
  loadingText: 'Chargement...',
})

const emit = defineEmits<{
  submit: [data: TravelFormData]
}>()

const open = defineModel<boolean>({ required: true })

const countries = ref<Country[]>([])
const showAdvanced = ref(false)

function defaultForm(): TravelFormData {
  return {
    transport_type: 'ship',
    origin_country_id: '',
    destination_country_id: '',
    departure_date: '',
    estimated_arrival_date: '',
    max_weight: '',
    max_volume: '',
    price_per_unit: '',
    itinerary: '',
    container: '',
    min_load_percentage: '0',
    max_load_percentage: '100',
  }
}

const form = reactive<TravelFormData>(defaultForm())

watch(open, async (val) => {
  if (!val) return
  showAdvanced.value = false
  Object.assign(form, defaultForm())
  if (props.initialValues) {
    Object.assign(form, props.initialValues)
  }
  if (countries.value.length === 0) {
    try {
      const { data } = await countriesApi.getAll()
      countries.value = data.filter(c => c.is_active)
    } catch { /* non-blocking */ }
  }
})
</script>

<template>
  <ModalSheet v-model="open" :title="title">
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
            :min="minDepartureDate"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Arrivée estimée</label>
          <input
            v-model="form.estimated_arrival_date"
            type="date"
            class="input-field"
            :min="form.departure_date || minDepartureDate"
          />
        </div>
      </div>

      <!-- Capacity -->
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-2">
          <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Poids max (kg)</label>
          <input v-model="form.max_weight" type="number" min="0" step="0.1" class="input-field" placeholder="Ex: 5000" />
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Volume max (m³)</label>
          <input v-model="form.max_volume" type="number" min="0" step="0.01" class="input-field" placeholder="Ex: 20" />
        </div>
      </div>

      <!-- Price per unit -->
      <div class="flex flex-col gap-2">
        <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">
          Prix par {{ form.transport_type === 'plane' ? 'kg' : 'm³' }} (€)
        </label>
        <div class="relative">
          <input
            v-model="form.price_per_unit"
            type="number"
            min="0"
            step="0.01"
            class="input-field pr-10"
            :placeholder="form.transport_type === 'plane' ? 'Ex: 8.50' : 'Ex: 120'"
          />
          <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-app-faint pointer-events-none">€</span>
        </div>
        <p class="text-[11px] text-app-faint">
          Laissez vide si le prix n'est pas encore défini. Le prix final du colis sera calculé à sa validation.
        </p>
      </div>

      <!-- Itinerary -->
      <div class="flex flex-col gap-2">
        <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Itinéraire</label>
        <input v-model="form.itinerary" type="text" class="input-field" placeholder="Ex: Paris → Dakar via Las Palmas" />
      </div>

      <!-- Container -->
      <div class="flex flex-col gap-2">
        <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Conteneur</label>
        <input v-model="form.container" type="text" class="input-field" placeholder="Ex: MSCU1234567" />
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
              <input v-model="form.min_load_percentage" type="number" min="0" max="100" class="input-field" placeholder="0" />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Charge max (%)</label>
              <input v-model="form.max_load_percentage" type="number" min="0" max="100" class="input-field" placeholder="100" />
            </div>
          </div>
        </div>
      </div>

      <ErrorAlert :message="error" />
    </div>

    <template #footer>
      <AppButton :loading="loading" :full="true" :loading-text="loadingText" @click="emit('submit', { ...form })">
        {{ submitLabel }}
      </AppButton>
    </template>
  </ModalSheet>
</template>
