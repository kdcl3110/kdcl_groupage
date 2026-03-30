<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const form = reactive({ email: '', password: '' })
const error = ref('')
const loading = ref(false)
const showRegister = ref(false)

const registerForm = reactive({
  first_name: '',
  last_name: '',
  email: '',
  password: '',
})
const registerError = ref('')
const registerLoading = ref(false)

async function handleLogin() {
  error.value = ''
  if (!form.email || !form.password) {
    error.value = 'Veuillez remplir tous les champs.'
    return
  }
  loading.value = true
  try {
    await auth.login(form.email, form.password)
    router.push('/voyages')
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message ?? 'Email ou mot de passe incorrect.'
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  registerError.value = ''
  if (!registerForm.first_name || !registerForm.last_name || !registerForm.email || !registerForm.password) {
    registerError.value = 'Veuillez remplir tous les champs.'
    return
  }
  registerLoading.value = true
  try {
    const { authApi } = await import('@/api/auth')
    const { data } = await authApi.register(registerForm)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    auth.login(registerForm.email, registerForm.password)
    router.push('/voyages')
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    registerError.value = e.response?.data?.message ?? 'Erreur lors de la création du compte.'
  } finally {
    registerLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh flex items-center justify-center px-4 py-8 sm:p-8 relative overflow-hidden">
    <!-- Bg glow -->
    <div class="absolute -top-[150px] left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(168,19,183,0.25)_0%,transparent_70%)] pointer-events-none" />

    <div class="w-full max-w-[460px] flex flex-col items-center gap-6">
      <!-- Logo -->
      <div class="flex flex-col items-center gap-3 text-center">
        <div class="drop-shadow-[0_0_20px_rgba(168,19,183,0.5)]">
          <svg width="56" height="56" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="16" fill="url(#login-lg1)" />
            <text x="24" y="33" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="white">KG</text>
            <defs>
              <linearGradient id="login-lg1" x1="0" y1="0" x2="48" y2="48">
                <stop offset="0%" stop-color="#c91fd6"/>
                <stop offset="100%" stop-color="#8a0f97"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 class="text-[28px] font-extrabold bg-gradient-to-br from-[#d946ef] via-[#a813b7] to-[#6366f1] bg-clip-text text-transparent tracking-tight">KDCL Groupage</h1>
        <p class="text-base text-app-muted">Gestion de fret intelligente</p>
      </div>

      <!-- Login Card -->
      <div v-if="!showRegister" class="glass w-full rounded-[24px] p-6 sm:p-8 flex flex-col gap-5">
        <h2 class="text-[22px] font-bold text-app-primary">Se connecter</h2>

        <form @submit.prevent="handleLogin" class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Adresse email</label>
            <input
              v-model="form.email"
              type="email"
              class="input-field"
              placeholder="votre@email.com"
              autocomplete="email"
              :disabled="loading"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Mot de passe</label>
            <input
              v-model="form.password"
              type="password"
              class="input-field"
              placeholder="••••••••"
              autocomplete="current-password"
              :disabled="loading"
            />
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
            <span v-else>Se connecter</span>
          </button>
        </form>

        <!-- Divider -->
        <div class="flex items-center gap-3 text-app-muted text-xs">
          <span class="flex-1 h-px bg-[var(--glass-border)]" />
          <span>ou</span>
          <span class="flex-1 h-px bg-[var(--glass-border)]" />
        </div>

        <button
          class="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-[15px] font-semibold text-[#A813B7] border-[1.5px] border-[#A813B7] bg-transparent transition-colors hover:bg-[rgba(168,19,183,0.1)] cursor-pointer"
          @click="showRegister = true"
        >
          Créer un compte
        </button>
      </div>

      <!-- Register Card -->
      <div v-else class="glass w-full rounded-[24px] p-6 sm:p-8 flex flex-col gap-5">
        <button
          class="flex items-center gap-1.5 text-sm text-app-muted cursor-pointer bg-transparent border-none p-0 transition-colors hover:text-app-primary"
          @click="showRegister = false"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Retour
        </button>

        <h2 class="text-xl font-bold text-app-primary">Créer un compte</h2>

        <form @submit.prevent="handleRegister" class="flex flex-col gap-4">
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Prénom</label>
              <input v-model="registerForm.first_name" type="text" class="input-field" placeholder="Jean" :disabled="registerLoading" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Nom</label>
              <input v-model="registerForm.last_name" type="text" class="input-field" placeholder="Dupont" :disabled="registerLoading" />
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Adresse email</label>
            <input v-model="registerForm.email" type="email" class="input-field" placeholder="votre@email.com" autocomplete="email" :disabled="registerLoading" />
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Mot de passe</label>
            <input v-model="registerForm.password" type="password" class="input-field" placeholder="Minimum 8 caractères" autocomplete="new-password" :disabled="registerLoading" />
          </div>

          <Transition name="fade">
            <div v-if="registerError" class="flex items-center gap-2 px-3.5 py-2.5 bg-red-500/10 border border-red-500/25 rounded-[10px] text-[13px] text-red-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {{ registerError }}
            </div>
          </Transition>

          <button type="submit" class="btn-primary w-full" :disabled="registerLoading">
            <span v-if="registerLoading" class="btn-spinner" />
            <span v-else>Créer mon compte</span>
          </button>
        </form>
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
