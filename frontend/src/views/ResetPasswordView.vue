<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from '@/api/auth'
import PasswordInput from '@/components/common/PasswordInput.vue'
import PasswordStrengthBar from '@/components/common/PasswordStrengthBar.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import AppButton from '@/components/common/AppButton.vue'

const route = useRoute()
const router = useRouter()

const token = computed(() => String(route.query.token ?? ''))

const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)

const missingToken = computed(() => !token.value)

onMounted(() => {
  if (missingToken.value) {
    error.value = 'Lien invalide ou expiré. Veuillez recommencer la procédure.'
  }
})

async function handleReset() {
  error.value = ''
  if (!newPassword.value || !confirmPassword.value) {
    error.value = 'Veuillez remplir tous les champs.'
    return
  }
  if (newPassword.value.length < 8) {
    error.value = 'Le mot de passe doit contenir au moins 8 caractères.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Les mots de passe ne correspondent pas.'
    return
  }
  loading.value = true
  try {
    await authApi.resetPassword(token.value, newPassword.value)
    success.value = true
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message ?? 'Lien invalide ou expiré.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh flex items-center justify-center px-4 py-8 sm:p-8 relative overflow-hidden">
    <div class="absolute -top-[150px] left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-[radial-gradient(circle,var(--primary-25)_0%,transparent_70%)] pointer-events-none" />

    <div class="w-full max-w-[460px] flex flex-col items-center gap-6">
      <!-- Logo -->
      <div class="flex flex-col items-center gap-3 text-center">
        <div class="drop-shadow-[0_0_20px_var(--primary-50)]">
          <svg width="56" height="56" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="16" fill="url(#reset-lg1)" />
            <text x="24" y="33" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="white">KG</text>
            <defs>
              <linearGradient id="reset-lg1" x1="0" y1="0" x2="48" y2="48">
                <stop offset="0%" style="stop-color: var(--primary-light)"/>
                <stop offset="100%" style="stop-color: var(--primary-dark)"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 class="text-[28px] font-extrabold bg-gradient-to-br from-[var(--primary-light)] via-[var(--primary)] to-[#6366f1] bg-clip-text text-transparent tracking-tight">KDCL Groupage</h1>
      </div>

      <div class="glass w-full rounded-[24px] p-6 sm:p-8 flex flex-col gap-5">

        <!-- ── Success ── -->
        <template v-if="success">
          <div class="flex flex-col items-center gap-4 py-4 text-center">
            <div class="w-16 h-16 rounded-full bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.3)] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <p class="text-base font-bold text-app-primary">Mot de passe modifié !</p>
              <p class="text-sm text-app-muted mt-1.5">Votre mot de passe a été réinitialisé avec succès.</p>
            </div>
          </div>
          <AppButton :full="true" @click="router.push('/login')">Se connecter</AppButton>
        </template>

        <!-- ── Invalid token ── -->
        <template v-else-if="missingToken">
          <div class="flex flex-col items-center gap-4 py-4 text-center">
            <div class="w-16 h-16 rounded-full bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.3)] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <p class="text-base font-bold text-app-primary">Lien invalide</p>
              <p class="text-sm text-app-muted mt-1.5">Ce lien est invalide ou a expiré. Veuillez recommencer la procédure.</p>
            </div>
          </div>
          <AppButton :full="true" @click="router.push('/login')">Retour à la connexion</AppButton>
        </template>

        <!-- ── Reset form ── -->
        <template v-else>
          <div>
            <h2 class="text-xl font-bold text-app-primary">Nouveau mot de passe</h2>
            <p class="text-sm text-app-muted mt-1.5">Choisissez un mot de passe sécurisé d'au moins 8 caractères.</p>
          </div>

          <form @submit.prevent="handleReset" class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Nouveau mot de passe</label>
              <PasswordInput v-model="newPassword" placeholder="Minimum 8 caractères" :disabled="loading" autocomplete="new-password" />
              <PasswordStrengthBar :password="newPassword" />
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Confirmer le mot de passe</label>
              <PasswordInput v-model="confirmPassword" :disabled="loading" autocomplete="new-password" />
              <Transition name="fade">
                <p
                  v-if="confirmPassword && newPassword"
                  class="text-[12px] flex items-center gap-1"
                  :class="newPassword === confirmPassword ? 'text-green-400' : 'text-red-400'"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline v-if="newPassword === confirmPassword" points="20 6 9 17 4 12"/>
                    <template v-else>
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </template>
                  </svg>
                  {{ newPassword === confirmPassword ? 'Les mots de passe correspondent' : 'Les mots de passe ne correspondent pas' }}
                </p>
              </Transition>
            </div>

            <ErrorAlert :message="error" />

            <AppButton type="submit" :loading="loading" :full="true" loading-text="Réinitialisation...">
              Réinitialiser le mot de passe
            </AppButton>
          </form>

          <button
            class="flex items-center justify-center gap-1.5 text-sm text-app-muted hover:text-app-primary transition-colors cursor-pointer bg-transparent border-none"
            @click="router.push('/login')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Retour à la connexion
          </button>
        </template>

      </div>

      <p class="text-[12px] text-app-faint">KDCL Groupage &copy; 2024</p>
    </div>
  </div>
</template>
