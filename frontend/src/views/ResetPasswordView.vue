<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from '@/api/auth'

const route = useRoute()
const router = useRouter()

const token = computed(() => String(route.query.token ?? ''))

const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)

// If no token in URL, show an error immediately
const missingToken = computed(() => !token.value)

onMounted(() => {
  if (missingToken.value) {
    error.value = 'Lien invalide ou expiré. Veuillez recommencer la procédure.'
  }
})

const passwordStrength = computed(() => {
  const p = newPassword.value
  if (!p) return 0
  let score = 0
  if (p.length >= 8) score++
  if (/[A-Z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  return score
})

const strengthLabel = computed(() => {
  const labels = ['', 'Faible', 'Moyen', 'Bon', 'Fort']
  return labels[passwordStrength.value] ?? ''
})

const strengthColor = computed(() => {
  const colors = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400']
  return colors[passwordStrength.value] ?? ''
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
    <!-- Bg glow -->
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
              <p class="text-sm text-app-muted mt-1.5">
                Votre mot de passe a été réinitialisé avec succès.
              </p>
            </div>
          </div>
          <button class="btn-primary w-full" @click="router.push('/login')">
            Se connecter
          </button>
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
          <button class="btn-primary w-full" @click="router.push('/login')">
            Retour à la connexion
          </button>
        </template>

        <!-- ── Reset form ── -->
        <template v-else>
          <div>
            <h2 class="text-xl font-bold text-app-primary">Nouveau mot de passe</h2>
            <p class="text-sm text-app-muted mt-1.5">Choisissez un mot de passe sécurisé d'au moins 8 caractères.</p>
          </div>

          <form @submit.prevent="handleReset" class="flex flex-col gap-4">
            <!-- New password -->
            <div class="flex flex-col gap-2">
              <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Nouveau mot de passe</label>
              <div class="relative">
                <input
                  v-model="newPassword"
                  :type="showNew ? 'text' : 'password'"
                  class="input-field"
                  placeholder="Minimum 8 caractères"
                  autocomplete="new-password"
                  :disabled="loading"
                  style="padding-right: 44px;"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-app-faint hover:text-app-muted transition-colors cursor-pointer bg-transparent border-none p-1"
                  @click="showNew = !showNew"
                  tabindex="-1"
                >
                  <svg v-if="showNew" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                  <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
              <!-- Strength bar -->
              <div v-if="newPassword" class="flex flex-col gap-1">
                <div class="flex gap-1">
                  <div
                    v-for="i in 4" :key="i"
                    class="flex-1 h-1 rounded-full transition-all duration-300"
                    :class="i <= passwordStrength ? strengthColor : 'bg-white/10'"
                  />
                </div>
                <p class="text-[11px]" :class="strengthColor.replace('bg-', 'text-')">{{ strengthLabel }}</p>
              </div>
            </div>

            <!-- Confirm password -->
            <div class="flex flex-col gap-2">
              <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Confirmer le mot de passe</label>
              <div class="relative">
                <input
                  v-model="confirmPassword"
                  :type="showConfirm ? 'text' : 'password'"
                  class="input-field"
                  placeholder="••••••••"
                  autocomplete="new-password"
                  :disabled="loading"
                  style="padding-right: 44px;"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-app-faint hover:text-app-muted transition-colors cursor-pointer bg-transparent border-none p-1"
                  @click="showConfirm = !showConfirm"
                  tabindex="-1"
                >
                  <svg v-if="showConfirm" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                  <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
              <!-- Match indicator -->
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

            <Transition name="fade">
              <div v-if="error" class="flex items-center gap-2 px-3.5 py-2.5 bg-red-500/10 border border-red-500/25 rounded-[10px] text-[13px] text-red-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {{ error }}
              </div>
            </Transition>

            <button type="submit" class="btn-primary w-full" :disabled="loading">
              <span v-if="loading" class="btn-spinner" />
              <span v-else>Réinitialiser le mot de passe</span>
            </button>
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
