<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import ModalSheet from '@/components/common/ModalSheet.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import AppButton from '@/components/common/AppButton.vue'
import RefreshButton from '@/components/common/RefreshButton.vue'
import FloatingActionButton from '@/components/common/FloatingActionButton.vue'
import PhoneInput from '@/components/common/PhoneInput.vue'
import { recipientsApi } from '@/api/recipients'
import type { Recipient } from '@/types'

const recipients = ref<Recipient[]>([])
const loading = ref(true)
const error = ref('')
const showSheet = ref(false)
const editingRecipient = ref<Recipient | null>(null)
const formLoading = ref(false)
const formError = ref('')
const formPhoneValid = ref(true)

const form = reactive({
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  country: '',
})

function resetForm() {
  form.first_name = ''
  form.last_name = ''
  form.phone = ''
  form.email = ''
  form.address = ''
  form.city = ''
  form.country = ''
  formError.value = ''
  editingRecipient.value = null
}

function openCreate() {
  resetForm()
  showSheet.value = true
}

function openEdit(r: Recipient) {
  editingRecipient.value = r
  form.first_name = r.first_name
  form.last_name = r.last_name
  form.phone = r.phone
  form.email = r.email ?? ''
  form.address = r.address
  form.city = r.city
  form.country = r.country
  showSheet.value = true
}

async function fetchRecipients() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await recipientsApi.getAll()
    recipients.value = data
  } catch {
    error.value = 'Impossible de charger les destinataires.'
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  formError.value = ''
  if (!form.first_name || !form.last_name || !form.phone || !form.address || !form.city || !form.country) {
    formError.value = 'Veuillez remplir tous les champs obligatoires.'
    return
  }
  if (!formPhoneValid.value) {
    formError.value = 'Veuillez entrer un numéro de téléphone valide.'
    return
  }
  formLoading.value = true
  try {
    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone,
      email: form.email || null,
      address: form.address,
      city: form.city,
      country: form.country,
    }
    if (editingRecipient.value) {
      await recipientsApi.update(editingRecipient.value.recipient_id, payload)
    } else {
      await recipientsApi.create(payload)
    }
    showSheet.value = false
    resetForm()
    await fetchRecipients()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    formError.value = e.response?.data?.message ?? 'Erreur lors de la sauvegarde.'
  } finally {
    formLoading.value = false
  }
}

async function handleDelete(id: number) {
  if (!confirm('Supprimer ce destinataire ?')) return
  try {
    await recipientsApi.remove(id)
    recipients.value = recipients.value.filter((r) => r.recipient_id !== id)
  } catch {
    alert('Impossible de supprimer ce destinataire.')
  }
}

function getInitials(r: Recipient) {
  return (r.first_name[0] + r.last_name[0]).toUpperCase()
}

onMounted(fetchRecipients)
</script>

<template>
  <AppLayout>
    <div class="p-2 sm:p-4 lg:p-6 flex flex-col gap-4">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-extrabold text-app-primary tracking-tight">Destinataires</h1>
        <RefreshButton :loading="loading" @click="fetchRecipients" />
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex flex-col gap-2.5">
        <div v-for="i in 4" :key="i" class="glass rounded-[20px] p-4">
          <div class="flex gap-3 items-center">
            <div class="skeleton w-11 h-11 rounded-full shrink-0" />
            <div class="flex-1">
              <div class="skeleton h-3.5 w-1/2" />
              <div class="skeleton h-3 w-[35%] mt-1.5" />
            </div>
          </div>
        </div>
      </div>

      <!-- Error -->
      <EmptyState v-else-if="error" icon="⚠️" title="Erreur" :message="error">
        <AppButton variant="outline" class="mt-1" @click="fetchRecipients">Réessayer</AppButton>
      </EmptyState>

      <!-- Empty -->
      <EmptyState v-else-if="recipients.length === 0" icon="👥" title="Aucun destinataire" message="Ajoutez vos destinataires pour les associer à vos colis." />

      <!-- List -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="r in recipients"
          :key="r.recipient_id"
          class="glass rounded-[20px] px-4 py-3.5 flex items-center gap-3"
        >
          <!-- Avatar -->
          <div class="w-11 h-11 rounded-full bg-gradient-to-br from-[var(--primary-30)] to-[var(--primary-15)] border border-[var(--primary-30)] flex items-center justify-center text-sm font-bold text-[var(--primary)] shrink-0">
            {{ getInitials(r) }}
          </div>
          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="text-[15px] font-semibold text-app-primary truncate mb-0.5">{{ r.first_name }} {{ r.last_name }}</div>
            <div class="text-xs text-app-muted mb-0.5">{{ r.phone }}</div>
            <div class="flex items-center gap-1 text-xs text-app-faint">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {{ r.city }}, {{ r.country }}
            </div>
          </div>
          <!-- Actions -->
          <div class="flex gap-1.5 shrink-0">
            <button
              class="w-8 h-8 rounded-lg glass flex items-center justify-center text-app-muted cursor-pointer transition-colors active:bg-[var(--glass-bg-hover)]"
              @click="openEdit(r)"
              aria-label="Modifier"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button
              class="w-8 h-8 rounded-lg glass flex items-center justify-center text-red-400 cursor-pointer transition-colors active:bg-[var(--glass-bg-hover)]"
              @click="handleDelete(r.recipient_id)"
              aria-label="Supprimer"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <FloatingActionButton aria-label="Ajouter un destinataire" @click="openCreate" />

    <!-- Sheet -->
    <ModalSheet v-model="showSheet" :title="editingRecipient ? 'Modifier' : 'Nouveau destinataire'" max-width="430px">
      <form @submit.prevent="handleSubmit" class="flex flex-col gap-3.5 px-5 py-5">
                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1.5">
                    <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Prénom *</label>
                    <input v-model="form.first_name" type="text" class="input-field" placeholder="Jean" :disabled="formLoading" />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Nom *</label>
                    <input v-model="form.last_name" type="text" class="input-field" placeholder="Dupont" :disabled="formLoading" />
                  </div>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Téléphone *</label>
                  <PhoneInput v-model="form.phone" :disabled="formLoading" @valid="formPhoneValid = $event" />
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Email</label>
                  <input v-model="form.email" type="email" class="input-field" placeholder="email@exemple.com" :disabled="formLoading" />
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Adresse *</label>
                  <input v-model="form.address" type="text" class="input-field" placeholder="123 Rue de la Paix" :disabled="formLoading" />
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1.5">
                    <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Ville *</label>
                    <input v-model="form.city" type="text" class="input-field" placeholder="Paris" :disabled="formLoading" />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Pays *</label>
                    <input v-model="form.country" type="text" class="input-field" placeholder="France" :disabled="formLoading" />
                  </div>
                </div>

        <ErrorAlert :message="formError" />
        <AppButton type="submit" :loading="formLoading" :full="true" :loading-text="editingRecipient ? 'Enregistrement...' : 'Ajout...'">
          {{ editingRecipient ? 'Enregistrer' : 'Ajouter' }}
        </AppButton>
      </form>
    </ModalSheet>
  </AppLayout>
</template>
