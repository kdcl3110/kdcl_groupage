<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import { usersApi } from '@/api/users'
import { useToastStore } from '@/stores/toast'
import type { GroupeurProfile } from '@/types'

const route  = useRoute()
const router = useRouter()
const toast  = useToastStore()

const userId  = computed(() => Number(route.params.id))
const profile = ref<GroupeurProfile | null>(null)
const loading = ref(true)
const error   = ref('')

function initials(p: GroupeurProfile) {
  return `${p.first_name[0]}${p.last_name[0]}`.toUpperCase()
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function shareProfile() {
  const url = `${window.location.origin}/groupeur/${userId.value}`
  if (navigator.share) {
    navigator.share({
      title: profile.value ? `${profile.value.first_name} ${profile.value.last_name} — Transitaire` : 'Profil transitaire',
      url,
    }).catch(() => {})
  } else {
    navigator.clipboard.writeText(url)
    toast.success('Lien copié dans le presse-papier.')
  }
}

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    const { data } = await usersApi.getProfile(userId.value)
    profile.value = data
  } catch {
    error.value = 'Impossible de charger ce profil.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <AppLayout>
    <div class="p-4 sm:p-6 flex flex-col gap-4">

      <!-- Back -->
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
      <div v-if="loading" class="flex flex-col gap-4">
        <div class="glass rounded-[20px] p-6 flex flex-col items-center gap-4">
          <div class="skeleton w-20 h-20 rounded-full" />
          <div class="skeleton h-5 w-40" />
          <div class="skeleton h-3 w-28" />
        </div>
        <div class="glass rounded-[20px] p-5 flex flex-col gap-3">
          <div class="skeleton h-4 w-1/2" />
          <div class="skeleton h-4 w-2/3" />
          <div class="skeleton h-4 w-1/3" />
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="flex flex-col items-center gap-3 py-16 text-center text-app-muted">
        <p class="font-semibold text-app-primary">Erreur</p>
        <p class="text-sm">{{ error }}</p>
      </div>

      <template v-else-if="profile">

        <!-- Hero card -->
        <div class="glass rounded-[20px] p-6 flex flex-col items-center gap-3 text-center">
          <!-- Avatar -->
          <div class="w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 shrink-0">
            <img
              v-if="profile.profile_picture"
              :src="profile.profile_picture"
              alt="Avatar"
              class="w-full h-full object-cover"
            />
            <div
              v-else
              class="w-full h-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center"
            >
              <span class="text-2xl font-bold text-white">{{ initials(profile) }}</span>
            </div>
          </div>

          <div>
            <h1 class="text-xl font-extrabold text-app-primary">{{ profile.first_name }} {{ profile.last_name }}</h1>
            <p class="text-[13px] text-app-muted mt-0.5">{{ profile.city }}, {{ profile.country }}</p>
          </div>

          <!-- Stats -->
          <div class="flex items-center gap-6 mt-1">
            <div class="flex flex-col items-center gap-0.5">
              <span class="text-xl font-bold text-app-primary">{{ profile.travel_count }}</span>
              <span class="text-[11px] text-app-muted">voyage{{ profile.travel_count > 1 ? 's' : '' }}</span>
            </div>
            <div class="w-px h-8 bg-[var(--glass-border)]" />
            <div class="flex flex-col items-center gap-0.5">
              <span class="text-[13px] font-semibold text-app-primary">{{ formatDate(profile.registration_date) }}</span>
              <span class="text-[11px] text-app-muted">membre depuis</span>
            </div>
          </div>

          <!-- Share button -->
          <button
            class="mt-1 flex items-center gap-2 px-5 py-2 rounded-full bg-[var(--primary-10)] border border-[var(--primary-25)] text-[var(--primary)] text-sm font-semibold cursor-pointer transition-colors active:bg-[var(--primary-20)]"
            @click="shareProfile"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Partager ce profil
          </button>
        </div>

        <!-- Contact & vérifications -->
        <div class="glass rounded-[20px] p-5 flex flex-col gap-0">
          <h2 class="text-[13px] font-bold text-app-muted uppercase tracking-[0.06em] mb-3">Contact</h2>

          <!-- Téléphone -->
          <div class="flex items-center justify-between py-3 border-b border-[var(--glass-border)]">
            <div class="flex items-center gap-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="text-app-muted shrink-0">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.36 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/>
              </svg>
              <span class="text-[14px] text-app-primary">{{ profile.phone }}</span>
            </div>
            <span
              class="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
              :class="profile.phone_verified ? 'bg-green-500/10 text-green-400' : 'bg-white/[0.06] text-app-faint'"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline v-if="profile.phone_verified" points="20 6 9 17 4 12"/>
                <line v-else x1="18" y1="6" x2="6" y2="18"/><line v-if="!profile.phone_verified" x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              {{ profile.phone_verified ? 'Vérifié' : 'Non vérifié' }}
            </span>
          </div>

          <!-- Email -->
          <div class="flex items-center justify-between py-3">
            <div class="flex items-center gap-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="text-app-muted shrink-0">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <span class="text-[14px] text-app-primary">{{ profile.email }}</span>
            </div>
            <span
              class="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
              :class="profile.email_verified ? 'bg-green-500/10 text-green-400' : 'bg-white/[0.06] text-app-faint'"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline v-if="profile.email_verified" points="20 6 9 17 4 12"/>
                <line v-else x1="18" y1="6" x2="6" y2="18"/><line v-if="!profile.email_verified" x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              {{ profile.email_verified ? 'Vérifié' : 'Non vérifié' }}
            </span>
          </div>
        </div>

      </template>

    </div>
  </AppLayout>
</template>
