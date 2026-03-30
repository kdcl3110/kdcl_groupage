<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { packagesApi } from '@/api/packages'
import { recipientsApi } from '@/api/recipients'
import { travelsApi } from '@/api/travels'
import type { Package, Recipient, Travel } from '@/types'

const packages = ref<Package[]>([])
const recipients = ref<Recipient[]>([])
const travels = ref<Travel[]>([])
const loading = ref(true)
const error = ref('')
const showSheet = ref(false)
const formLoading = ref(false)
const formError = ref('')

const form = reactive({
  description: '',
  weight: '',
  volume: '',
  declared_value: '',
  recipient_id: '',
  travel_id: '',
  special_instructions: '',
})

function resetForm() {
  form.description = ''
  form.weight = ''
  form.volume = ''
  form.declared_value = ''
  form.recipient_id = ''
  form.travel_id = ''
  form.special_instructions = ''
  formError.value = ''
}

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

async function handleCreatePackage() {
  formError.value = ''
  if (!form.description || !form.weight || !form.volume || !form.declared_value || !form.recipient_id) {
    formError.value = 'Veuillez remplir les champs obligatoires.'
    return
  }
  formLoading.value = true
  try {
    await packagesApi.create({
      description: form.description,
      weight: parseFloat(form.weight),
      volume: parseFloat(form.volume),
      declared_value: parseFloat(form.declared_value),
      recipient_id: parseInt(form.recipient_id),
      travel_id: form.travel_id ? parseInt(form.travel_id) : null,
      special_instructions: form.special_instructions || null,
    })
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

function openSheet() {
  resetForm()
  showSheet.value = true
  fetchFormData()
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
          class="mt-3 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-[#A813B7] border-[1.5px] border-[#A813B7] bg-transparent transition-colors hover:bg-[rgba(168,19,183,0.1)] cursor-pointer"
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
          <div class="flex items-center justify-between">
            <span class="text-[13px] font-bold text-[#A813B7] font-mono tracking-[0.05em]">{{ pkg.tracking_number }}</span>
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
      class="fixed bottom-22 sm:bottom-20 right-4 sm:right-6 lg:right-8 w-14 h-14 rounded-full bg-gradient-to-br from-[#A813B7] to-[#8a0f97] glow-primary shadow-[0_4px_16px_rgba(0,0,0,0.3)] flex items-center justify-center cursor-pointer z-50 border-none text-white transition-all active:scale-[0.93]"
      @click="openSheet"
      aria-label="Nouveau colis"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>

    <!-- Create Sheet -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showSheet" class="overlay flex items-end md:items-center justify-center" @click.self="showSheet = false">
          <Transition name="slide-up">
            <div v-if="showSheet" class="sheet w-full max-w-[430px] md:max-w-[520px] md:rounded-3xl rounded-t-3xl px-5 pt-6 pb-[calc(24px+env(safe-area-inset-bottom,0px))]">
              <!-- Handle -->
              <div class="w-9 h-1 bg-[rgba(168,19,183,0.3)] rounded-full mx-auto mb-5" />

              <!-- Sheet header -->
              <div class="flex items-center justify-between mb-5">
                <h2 class="text-lg font-bold text-app-primary">Nouveau colis</h2>
                <button
                  class="w-8 h-8 rounded-full glass flex items-center justify-center text-app-muted cursor-pointer"
                  @click="showSheet = false"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <form @submit.prevent="handleCreatePackage" class="flex flex-col gap-3.5">
                <div class="flex flex-col gap-1.5">
                  <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Description *</label>
                  <input v-model="form.description" type="text" class="input-field" placeholder="Ex: Vêtements, électronique..." :disabled="formLoading" />
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1.5">
                    <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Poids (kg) *</label>
                    <input v-model="form.weight" type="number" step="0.1" min="0" class="input-field" placeholder="0.0" :disabled="formLoading" />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Volume (m³) *</label>
                    <input v-model="form.volume" type="number" step="0.01" min="0" class="input-field" placeholder="0.00" :disabled="formLoading" />
                  </div>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Valeur déclarée (€) *</label>
                  <input v-model="form.declared_value" type="number" min="0" class="input-field" placeholder="0" :disabled="formLoading" />
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Destinataire *</label>
                  <select v-model="form.recipient_id" class="input-field select-field" :disabled="formLoading">
                    <option value="">Choisir un destinataire</option>
                    <option v-for="r in recipients" :key="r.recipient_id" :value="r.recipient_id">
                      {{ r.first_name }} {{ r.last_name }} — {{ r.city }}
                    </option>
                  </select>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Voyage (optionnel)</label>
                  <select v-model="form.travel_id" class="input-field select-field" :disabled="formLoading">
                    <option value="">Aucun voyage</option>
                    <option v-for="t in travels" :key="t.travel_id" :value="t.travel_id">
                      {{ t.origin_country }} → {{ t.destination_country }}
                    </option>
                  </select>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Instructions spéciales</label>
                  <textarea v-model="form.special_instructions" class="input-field" style="min-height: 80px; resize: vertical;" placeholder="Instructions de manutention, fragilité..." :disabled="formLoading" />
                </div>

                <Transition name="fade">
                  <div v-if="formError" class="px-3.5 py-2.5 bg-red-500/10 border border-red-500/25 rounded-[10px] text-[13px] text-red-400">{{ formError }}</div>
                </Transition>

                <button type="submit" class="btn-primary w-full" :disabled="formLoading">
                  <span v-if="formLoading" class="btn-spinner" />
                  <span v-else>Créer le colis</span>
                </button>
              </form>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </AppLayout>
</template>

<style scoped>
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
