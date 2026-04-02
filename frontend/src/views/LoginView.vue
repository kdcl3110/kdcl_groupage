<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'
import { useToastStore } from '@/stores/toast'
import PasswordInput from '@/components/common/PasswordInput.vue'
import PhoneInput from '@/components/common/PhoneInput.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import AppButton from '@/components/common/AppButton.vue'

const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

// panel: 'login' | 'register' | 'forgot'
const panel = ref<'login' | 'register' | 'forgot'>('login')

// Login
const form = reactive({ email: '', password: '' })
const error = ref('')
const loading = ref(false)

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
    toast.error(error.value)
  } finally {
    loading.value = false
  }
}

// Register
const registerForm = reactive({ first_name: '', last_name: '', email: '', phone: '', street: '', city: '', country: '', postal_code: '', password: '' })
const registerError = ref('')
const registerLoading = ref(false)
const registerPhoneValid = ref(false)

async function handleRegister() {
  registerError.value = ''
  if (!registerForm.first_name || !registerForm.last_name || !registerForm.email || !registerForm.phone || !registerForm.street || !registerForm.city || !registerForm.country || !registerForm.password) {
    registerError.value = 'Veuillez remplir tous les champs.'
    return
  }
  if (!registerPhoneValid.value) {
    registerError.value = 'Veuillez entrer un numéro de téléphone valide.'
    return
  }
  registerLoading.value = true
  try {
    const { data } = await authApi.register(registerForm)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    await auth.login(registerForm.email, registerForm.password)
    router.push('/voyages')
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    registerError.value = e.response?.data?.message ?? 'Erreur lors de la création du compte.'
    toast.error(registerError.value)
  } finally {
    registerLoading.value = false
  }
}

// Forgot password
const forgotEmail = ref('')
const forgotError = ref('')
const forgotLoading = ref(false)
const forgotSent = ref(false)

async function handleForgot() {
  forgotError.value = ''
  if (!forgotEmail.value) {
    forgotError.value = 'Veuillez entrer votre adresse email.'
    return
  }
  forgotLoading.value = true
  try {
    await authApi.forgotPassword(forgotEmail.value)
    forgotSent.value = true
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    forgotError.value = e.response?.data?.message ?? 'Erreur lors de l\'envoi de l\'email.'
    toast.error(forgotError.value)
  } finally {
    forgotLoading.value = false
  }
}

function goToLogin() {
  panel.value = 'login'
  forgotSent.value = false
  forgotEmail.value = ''
  forgotError.value = ''
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
            <rect width="48" height="48" rx="16" fill="url(#login-lg1)" />
            <text x="24" y="33" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="18" fill="white">KG</text>
            <defs>
              <linearGradient id="login-lg1" x1="0" y1="0" x2="48" y2="48">
                <stop offset="0%" style="stop-color: var(--primary-light)"/>
                <stop offset="100%" style="stop-color: var(--primary-dark)"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 class="text-[28px] font-extrabold bg-gradient-to-br from-[var(--primary-light)] via-[var(--primary)] to-[#6366f1] bg-clip-text text-transparent tracking-tight">KDCL Groupage</h1>
        <p class="text-base text-app-muted">Gestion de fret intelligente</p>
      </div>

      <!-- ── Login Card ── -->
      <div v-if="panel === 'login'" class="glass w-full rounded-[24px] p-6 sm:p-8 flex flex-col gap-5">
        <h2 class="text-[22px] font-bold text-app-primary">Se connecter</h2>

        <form @submit.prevent="handleLogin" class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Adresse email</label>
            <input v-model="form.email" type="email" class="input-field" placeholder="votre@email.com" autocomplete="email" :disabled="loading" />
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Mot de passe</label>
              <button
                type="button"
                class="text-xs text-[var(--primary)] hover:text-[var(--primary-light)] transition-colors cursor-pointer bg-transparent border-none p-0"
                @click="panel = 'forgot'"
              >
                Mot de passe oublié ?
              </button>
            </div>
            <PasswordInput v-model="form.password" :disabled="loading" autocomplete="current-password" />
          </div>

          <ErrorAlert :message="error" />

          <AppButton type="submit" :loading="loading" :full="true" loading-text="Connexion...">
            Se connecter
          </AppButton>
        </form>

        <div class="flex items-center gap-3 text-app-muted text-xs">
          <span class="flex-1 h-px bg-[var(--glass-border)]" />
          <span>ou</span>
          <span class="flex-1 h-px bg-[var(--glass-border)]" />
        </div>

        <button
          class="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-[15px] font-semibold text-[var(--primary)] border-[1.5px] border-[var(--primary)] bg-transparent transition-colors hover:bg-[var(--primary-10)] cursor-pointer"
          @click="panel = 'register'"
        >
          Créer un compte
        </button>
      </div>

      <!-- ── Register Card ── -->
      <div v-else-if="panel === 'register'" class="glass w-full rounded-[24px] p-6 sm:p-8 flex flex-col gap-5">
        <button class="back-btn" @click="panel = 'login'">
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

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Téléphone</label>
            <PhoneInput v-model="registerForm.phone" :disabled="registerLoading" @valid="registerPhoneValid = $event" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Rue et numéro</label>
            <input v-model="registerForm.street" type="text" class="input-field" placeholder="Rue de la Paix 12" autocomplete="street-address" :disabled="registerLoading" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Ville</label>
              <input v-model="registerForm.city" type="text" class="input-field" placeholder="Bruxelles" autocomplete="address-level2" :disabled="registerLoading" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Code postal</label>
              <input v-model="registerForm.postal_code" type="text" class="input-field" placeholder="1000" autocomplete="postal-code" :disabled="registerLoading" />
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Pays</label>
            <input v-model="registerForm.country" type="text" class="input-field" placeholder="Belgique" autocomplete="country-name" :disabled="registerLoading" />
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Mot de passe</label>
            <PasswordInput v-model="registerForm.password" placeholder="Minimum 8 caractères" :disabled="registerLoading" autocomplete="new-password" />
          </div>

          <ErrorAlert :message="registerError" />

          <AppButton type="submit" :loading="registerLoading" :full="true" loading-text="Création...">
            Créer mon compte
          </AppButton>
        </form>
      </div>

      <!-- ── Forgot Password Card ── -->
      <div v-else class="glass w-full rounded-[24px] p-6 sm:p-8 flex flex-col gap-5">
        <button class="back-btn" @click="goToLogin">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Retour
        </button>

        <!-- Success state -->
        <template v-if="forgotSent">
          <div class="flex flex-col items-center gap-4 py-4 text-center">
            <div class="w-16 h-16 rounded-full bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.3)] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div>
              <p class="text-base font-bold text-app-primary">Email envoyé !</p>
              <p class="text-sm text-app-muted mt-1.5">
                Si un compte correspond à <strong class="text-app-primary">{{ forgotEmail }}</strong>,
                vous recevrez un lien de réinitialisation sous peu.
              </p>
            </div>
            <p class="text-xs text-app-faint">Vérifiez aussi vos spams.</p>
          </div>
          <button class="btn-primary w-full" @click="goToLogin">Retour à la connexion</button>
        </template>

        <!-- Form state -->
        <template v-else>
          <div>
            <h2 class="text-xl font-bold text-app-primary">Mot de passe oublié</h2>
            <p class="text-sm text-app-muted mt-1.5">
              Entrez votre adresse email pour recevoir un lien de réinitialisation.
            </p>
          </div>

          <form @submit.prevent="handleForgot" class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <label class="text-sm font-semibold text-app-muted uppercase tracking-[0.05em]">Adresse email</label>
              <input
                v-model="forgotEmail"
                type="email"
                class="input-field"
                placeholder="votre@email.com"
                autocomplete="email"
                :disabled="forgotLoading"
              />
            </div>

            <ErrorAlert :message="forgotError" />

            <AppButton type="submit" :loading="forgotLoading" :full="true" loading-text="Envoi...">
              Envoyer le lien
            </AppButton>
          </form>
        </template>
      </div>

      <p class="text-[12px] text-app-faint">KDCL Groupage &copy; 2024</p>
    </div>
  </div>
</template>

<style scoped>
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: var(--text-muted);
  cursor: pointer;
  background: transparent;
  border: none;
  padding: 0;
  transition: color 0.15s;
}
.back-btn:hover { color: var(--text-primary); }

</style>
