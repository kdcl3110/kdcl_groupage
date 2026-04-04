<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usersApi } from '@/api/users'
import { useAuthStore } from '@/stores/auth'

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()

const status = ref<'loading' | 'success' | 'error'>('loading')
const message = ref('')

onMounted(async () => {
  const token = route.query.token as string | undefined
  if (!token) {
    status.value = 'error'
    message.value = 'Lien de vérification invalide.'
    return
  }
  try {
    const { data } = await usersApi.verifyEmail(token)
    status.value = 'success'
    message.value = data.message
    // Mettre à jour le store si l'utilisateur est connecté
    if (auth.user) {
      auth.updateUser({ ...auth.user, email_verified: true })
    }
    setTimeout(() => router.push('/profil'), 3000)
  } catch (err: unknown) {
    status.value = 'error'
    const e = err as { response?: { data?: { message?: string } } }
    message.value = e.response?.data?.message ?? 'Lien invalide ou expiré.'
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6 bg-[var(--bg)]">
    <div class="glass rounded-[24px] p-8 max-w-sm w-full flex flex-col items-center gap-5 text-center">

      <!-- Loading -->
      <template v-if="status === 'loading'">
        <div class="w-12 h-12 rounded-full border-[3px] border-[var(--primary-20)] border-t-[var(--primary)] animate-spin" />
        <p class="text-app-muted text-sm">Vérification en cours…</p>
      </template>

      <!-- Success -->
      <template v-else-if="status === 'success'">
        <div class="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-green-400">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-extrabold text-app-primary">Email vérifié !</h1>
          <p class="text-sm text-app-muted mt-1">{{ message }}</p>
          <p class="text-xs text-app-faint mt-3">Redirection dans quelques secondes…</p>
        </div>
        <button
          class="btn-primary w-full"
          @click="router.push('/profil')"
        >
          Aller à mon profil
        </button>
      </template>

      <!-- Error -->
      <template v-else>
        <div class="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-400">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-extrabold text-app-primary">Lien invalide</h1>
          <p class="text-sm text-app-muted mt-1">{{ message }}</p>
        </div>
        <button
          class="btn-primary w-full"
          @click="router.push('/profil')"
        >
          Retour au profil
        </button>
      </template>

    </div>
  </div>
</template>
