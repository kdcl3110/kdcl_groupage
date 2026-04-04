<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import ModalSheet from '@/components/common/ModalSheet.vue'
import PasswordInput from '@/components/common/PasswordInput.vue'
import PasswordStrengthBar from '@/components/common/PasswordStrengthBar.vue'
import PhoneInput from '@/components/common/PhoneInput.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import AppButton from '@/components/common/AppButton.vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { authApi } from '@/api/auth'
import { usersApi } from '@/api/users'
import { useToastStore, apiError } from '@/stores/toast'

const router = useRouter()
const auth = useAuthStore()
const themeStore = useThemeStore()

const toast = useToastStore()
const showLogoutDialog = ref(false)

// ── Avatar ──────────────────────────────────────────────────────────────────
const avatarInput = ref<HTMLInputElement | null>(null)
const avatarLoading = ref(false)

async function handleAvatarChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  avatarLoading.value = true
  try {
    const { data } = await usersApi.uploadAvatar(file)
    auth.updateUser({ ...auth.user!, profile_picture: data.profile_picture })
    toast.success('Photo mise à jour.')
  } catch (err) {
    toast.error(apiError(err, 'Impossible de mettre à jour la photo.'))
  } finally {
    avatarLoading.value = false
    if (avatarInput.value) avatarInput.value.value = ''
  }
}

async function handleDeleteAvatar() {
  avatarLoading.value = true
  try {
    await usersApi.deleteAvatar()
    auth.updateUser({ ...auth.user!, profile_picture: null })
    toast.success('Photo supprimée.')
  } catch (err) {
    toast.error(apiError(err, 'Impossible de supprimer la photo.'))
  } finally {
    avatarLoading.value = false
  }
}

// ── Vérification email ───────────────────────────────────────────────────────
const emailVerifLoading = ref(false)

async function handleSendEmailVerification() {
  emailVerifLoading.value = true
  try {
    await usersApi.sendEmailVerification()
    toast.success('Email de vérification envoyé. Vérifiez votre boîte mail.')
  } catch (err) {
    toast.error(apiError(err, 'Impossible d\'envoyer l\'email de vérification.'))
  } finally {
    emailVerifLoading.value = false
  }
}

// ── Edit profile sheet ───────────────────────────────────────────────────
const showProfileSheet = ref(false)
const profileForm = reactive({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  street: '',
  city: '',
  country: '',
  postal_code: '',
})
const profileLoading = ref(false)
const profilePhoneValid = ref(true)

function openProfileSheet() {
  const u = auth.user
  if (!u) return
  profileForm.first_name  = u.first_name  ?? ''
  profileForm.last_name   = u.last_name   ?? ''
  profileForm.email       = u.email       ?? ''
  profileForm.phone       = u.phone       ?? ''
  profileForm.street      = u.street      ?? ''
  profileForm.city        = u.city        ?? ''
  profileForm.country     = u.country     ?? ''
  profileForm.postal_code = u.postal_code ?? ''
  showProfileSheet.value  = true
}

async function handleUpdateProfile() {
  if (!profileForm.first_name.trim() || !profileForm.last_name.trim()) {
    toast.error('Le prénom et le nom sont obligatoires.')
    return
  }
  if (profileForm.phone && !profilePhoneValid.value) {
    toast.error('Numéro de téléphone invalide.')
    return
  }
  profileLoading.value = true
  try {
    const { data } = await authApi.updateProfile({
      first_name:  profileForm.first_name.trim(),
      last_name:   profileForm.last_name.trim(),
      email:       profileForm.email.trim()       || undefined,
      phone:       profileForm.phone.trim()       || undefined,
      street:      profileForm.street.trim()      || undefined,
      city:        profileForm.city.trim()        || undefined,
      country:     profileForm.country.trim()     || undefined,
      postal_code: profileForm.postal_code.trim() || undefined,
    })
    auth.updateUser(data)
    showProfileSheet.value = false
    toast.success('Profil mis à jour.')
  } catch (err) {
    toast.error(apiError(err, 'Erreur lors de la mise à jour du profil.'))
  } finally {
    profileLoading.value = false
  }
}

// ── Change password sheet ─────────────────────────────────────────────────
const showPasswordSheet = ref(false)
const pwForm = reactive({ current: '', next: '', confirm: '' })
const pwError = ref('')
const pwLoading = ref(false)
const pwSuccess = ref(false)
function openPasswordSheet() {
  pwForm.current = ''
  pwForm.next = ''
  pwForm.confirm = ''
  pwError.value = ''
  pwSuccess.value = false
  showPasswordSheet.value = true
}

async function handleChangePassword() {
  pwError.value = ''
  if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
    pwError.value = 'Veuillez remplir tous les champs.'
    return
  }
  if (pwForm.next.length < 8) {
    pwError.value = 'Le nouveau mot de passe doit contenir au moins 8 caractères.'
    return
  }
  if (pwForm.next !== pwForm.confirm) {
    pwError.value = 'Les nouveaux mots de passe ne correspondent pas.'
    return
  }
  pwLoading.value = true
  try {
    await authApi.changePassword(pwForm.current, pwForm.next)
    pwSuccess.value = true
    toast.success('Mot de passe modifié avec succès.')
  } catch (err: unknown) {
    const msg = apiError(err, 'Erreur lors du changement de mot de passe.')
    pwError.value = msg
    toast.error(msg)
  } finally {
    pwLoading.value = false
  }
}

const isDark = computed(() => themeStore.theme === 'dark')

const user = computed(() => auth.user)

const initials = computed(() => {
  if (!user.value) return '??'
  return (user.value.first_name[0] + user.value.last_name[0]).toUpperCase()
})

const roleLabel = computed(() => {
  const map: Record<string, string> = {
    admin: 'Administrateur',
    freight_forwarder: 'Transitaire',
    client: 'Client',
  }
  return map[user.value?.role ?? ''] ?? user.value?.role ?? ''
})

const roleBadgeClass = computed(() => {
  const map: Record<string, string> = {
    admin: 'bg-[var(--primary-20)] border border-[var(--primary-35)] text-[var(--primary-light)]',
    freight_forwarder: 'bg-[rgba(59,130,246,0.2)] border border-[rgba(59,130,246,0.4)] text-[#60a5fa]',
    client: 'bg-[rgba(34,197,94,0.2)] border border-[rgba(34,197,94,0.4)] text-[#4ade80]',
  }
  return map[user.value?.role ?? ''] ?? 'bg-white/10 border border-[var(--glass-border)] text-app-muted'
})

function handleLogout() {
  auth.logout()
  router.push('/login')
}

function confirmLogout() {
  showLogoutDialog.value = false
  handleLogout()
}


</script>

<template>
  <AppLayout>
    <div class="p-2 sm:p-6 lg:p-8 flex flex-col gap-5 max-w-2xl lg:mx-auto">
      <!-- Avatar / Hero -->
      <div class="glass rounded-[20px] relative overflow-hidden flex flex-col items-center gap-3 px-5 py-7 text-center">
        <!-- Glow -->
        <div class="absolute -top-[60px] left-1/2 -translate-x-1/2 w-[200px] h-[200px] bg-[radial-gradient(circle,var(--primary-30)_0%,transparent_70%)] pointer-events-none" />
        <!-- Avatar cliquable -->
        <div class="relative z-10">
          <input ref="avatarInput" type="file" accept="image/*" class="hidden" @change="handleAvatarChange" />
          <button
            class="w-[72px] h-[72px] rounded-full overflow-hidden border-2 border-white/15 glow-primary cursor-pointer relative group"
            :disabled="avatarLoading"
            @click="avatarInput?.click()"
            aria-label="Modifier la photo"
          >
            <img
              v-if="user?.profile_picture"
              :src="user.profile_picture"
              alt="Avatar"
              class="w-full h-full object-cover"
            />
            <div
              v-else
              class="w-full h-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center text-2xl font-extrabold text-white"
            >{{ initials }}</div>
            <!-- Overlay édition -->
            <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <!-- Spinner -->
            <div v-if="avatarLoading" class="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div class="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            </div>
          </button>
          <!-- Bouton supprimer si photo existante -->
          <button
            v-if="user?.profile_picture && !avatarLoading"
            class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-500 border-2 border-[var(--bg)] flex items-center justify-center cursor-pointer"
            @click.stop="handleDeleteAvatar"
            aria-label="Supprimer la photo"
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Info -->
        <div class="flex flex-col items-center gap-1.5 z-10">
          <h1 class="text-xl font-extrabold text-app-primary tracking-tight">{{ user?.first_name }} {{ user?.last_name }}</h1>
          <div
            class="text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-[0.04em]"
            :class="roleBadgeClass"
          >{{ roleLabel }}</div>
          <!-- Email + badge vérifié -->
          <div class="flex items-center gap-1.5 mt-0.5">
            <p class="text-[13px] text-app-muted">{{ user?.email }}</p>
            <span
              v-if="user?.email_verified"
              class="flex items-center gap-0.5 text-[10px] font-semibold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full"
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Vérifié
            </span>
            <button
              v-else
              class="text-[10px] font-semibold text-[var(--primary)] bg-[var(--primary-10)] border border-[var(--primary-25)] px-1.5 py-0.5 rounded-full cursor-pointer transition-colors hover:bg-[var(--primary-20)] disabled:opacity-40"
              :disabled="emailVerifLoading"
              @click="handleSendEmailVerification"
            >
              {{ emailVerifLoading ? '…' : 'Vérifier' }}
            </button>
          </div>
          <div v-if="user?.phone" class="flex items-center gap-1.5 text-[12px] text-app-faint mt-0.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.55a16 16 0 0 0 8 8l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <span>{{ user.phone }}</span>
          </div>
          <div v-if="user?.city" class="flex items-center gap-1.5 text-[12px] text-app-faint">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span>{{ user.city }}{{ user.country ? ', ' + user.country : '' }}</span>
          </div>
        </div>
      </div>

      <!-- Compte -->
      <div class="flex flex-col gap-2">
        <h2 class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em]">Compte</h2>
        <div class="glass rounded-[20px] overflow-hidden">
          <div class="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors active:bg-white/5" @click="openProfileSheet">
            <div class="w-9 h-9 rounded-[10px] bg-white/[0.06] border border-[var(--glass-border)] flex items-center justify-center text-app-muted shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div class="flex-1 flex flex-col gap-0.5">
              <span class="text-sm font-semibold text-app-primary">Profil</span>
              <span class="text-xs text-app-muted">{{ user?.first_name }} {{ user?.last_name }}</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-app-faint">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
          <div class="h-px bg-[var(--glass-border)] mx-4" />

          <div class="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors active:bg-white/5" @click="openPasswordSheet">
            <div class="w-9 h-9 rounded-[10px] bg-white/[0.06] border border-[var(--glass-border)] flex items-center justify-center text-app-muted shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div class="flex-1 flex flex-col gap-0.5">
              <span class="text-sm font-semibold text-app-primary">Sécurité</span>
              <span class="text-xs text-app-muted">Changer le mot de passe</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-app-faint">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
          <div class="h-px bg-[var(--glass-border)] mx-4" />

          <div class="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors active:bg-white/5">
            <div class="w-9 h-9 rounded-[10px] bg-white/[0.06] border border-[var(--glass-border)] flex items-center justify-center text-app-muted shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <div class="flex-1 flex flex-col gap-0.5">
              <span class="text-sm font-semibold text-app-primary">Notifications</span>
              <span class="text-xs text-app-muted">Gérer les préférences</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-app-faint">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Préférences -->
      <div class="flex flex-col gap-2">
        <h2 class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em]">Préférences</h2>
        <div class="glass rounded-[20px] overflow-hidden">
          <div class="flex items-center gap-3 px-4 py-3.5">
            <div
              class="w-9 h-9 rounded-[10px] bg-white/[0.06] border border-[var(--glass-border)] flex items-center justify-center shrink-0"
              :class="isDark ? 'text-[#a78bfa]' : 'text-[#f59e0b]'"
            >
              <svg v-if="isDark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            </div>
            <div class="flex-1 flex flex-col gap-0.5">
              <span class="text-sm font-semibold text-app-primary">Thème</span>
              <span class="text-xs text-app-muted">{{ isDark ? 'Mode sombre' : 'Mode clair' }}</span>
            </div>
            <label class="theme-toggle">
              <input type="checkbox" :checked="!isDark" @change="themeStore.toggle()" />
              <div class="theme-toggle-track">
                <div class="theme-toggle-thumb" />
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- Aide et support -->
      <div class="flex flex-col gap-2">
        <h2 class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em]">Support</h2>
        <div class="glass rounded-[20px] overflow-hidden">
          <div
            class="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors active:bg-white/5"
            @click="router.push('/aide')"
          >
            <div class="w-9 h-9 rounded-[10px] bg-white/[0.06] border border-[var(--glass-border)] flex items-center justify-center text-app-muted shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div class="flex-1 flex flex-col gap-0.5">
              <span class="text-sm font-semibold text-app-primary">Aide et support</span>
              <span class="text-xs text-app-muted">FAQ, contact, signalement</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-app-faint">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>

          <div class="h-px bg-[var(--glass-border)] mx-4" />
          
          <div
            class="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors active:bg-white/5"
            @click="router.push('/a-propos')"
          >
            <div class="w-9 h-9 rounded-[10px] bg-white/[0.06] border border-[var(--glass-border)] flex items-center justify-center text-app-muted shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div class="flex-1 flex flex-col gap-0.5">
              <span class="text-sm font-semibold text-app-primary">À propos</span>
              <span class="text-xs text-app-muted">Version, CGU, confidentialité</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-app-faint">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- À propos -->
      <!-- <div class="flex flex-col gap-2">
        <h2 class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em]">Application</h2>
        
      </div> -->

      <!-- Logout -->
      <button
        class="w-full flex items-center justify-center gap-2.5 py-[15px] rounded-[20px] bg-[rgba(239,68,68,0.1)] border-[1.5px] border-[rgba(239,68,68,0.25)] text-red-400 text-[15px] font-semibold cursor-pointer transition-colors active:bg-[rgba(239,68,68,0.18)]"
        @click="showLogoutDialog = true"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Se déconnecter
      </button>

      <p class="text-[11px] text-app-faint text-center pb-2">ID: {{ user?.user_id }}</p>
    </div>

    <!-- Change password sheet -->
    <ModalSheet v-model="showPasswordSheet" title="Changer le mot de passe">
      <!-- Success -->
      <template v-if="pwSuccess">
        <div class="flex flex-col items-center gap-4 py-8 px-5 text-center">
          <div class="w-16 h-16 rounded-full bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.3)] flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <p class="text-base font-bold text-app-primary">Mot de passe modifié !</p>
            <p class="text-sm text-app-muted mt-1.5">Votre mot de passe a été mis à jour avec succès.</p>
          </div>
        </div>
        <div class="px-5 pb-5">
          <AppButton :full="true" @click="showPasswordSheet = false">Fermer</AppButton>
        </div>
      </template>

      <!-- Form -->
      <template v-else>
        <div class="flex flex-col gap-4 px-5 pb-5 pt-2">
          <div class="flex flex-col gap-1.5">
            <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Mot de passe actuel</label>
            <PasswordInput v-model="pwForm.current" :disabled="pwLoading" autocomplete="current-password" />
          </div>

          <div class="h-px bg-[var(--glass-border)]" />

          <div class="flex flex-col gap-1.5">
            <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Nouveau mot de passe</label>
            <PasswordInput v-model="pwForm.next" placeholder="Minimum 8 caractères" :disabled="pwLoading" autocomplete="new-password" />
            <PasswordStrengthBar :password="pwForm.next" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Confirmer le nouveau mot de passe</label>
            <PasswordInput v-model="pwForm.confirm" :disabled="pwLoading" autocomplete="new-password" />
            <Transition name="fade">
              <p
                v-if="pwForm.confirm && pwForm.next"
                class="text-[12px] flex items-center gap-1"
                :class="pwForm.next === pwForm.confirm ? 'text-green-400' : 'text-red-400'"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline v-if="pwForm.next === pwForm.confirm" points="20 6 9 17 4 12"/>
                  <template v-else>
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </template>
                </svg>
                {{ pwForm.next === pwForm.confirm ? 'Les mots de passe correspondent' : 'Les mots de passe ne correspondent pas' }}
              </p>
            </Transition>
          </div>

          <ErrorAlert :message="pwError" />

          <AppButton :full="true" :loading="pwLoading" loading-text="Mise à jour..." @click="handleChangePassword">
            Mettre à jour le mot de passe
          </AppButton>
        </div>
      </template>
    </ModalSheet>

    <!-- Edit profile sheet -->
    <ModalSheet v-model="showProfileSheet" title="Modifier le profil">
      <div class="flex flex-col gap-4 px-5 pb-5 pt-2">
        <!-- Name row -->
                <div class="flex gap-3">
                  <div class="flex-1 flex flex-col gap-1.5">
                    <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Prénom</label>
                    <input
                      v-model="profileForm.first_name"
                      type="text"
                      class="input-field"
                      placeholder="Jean"
                      :disabled="profileLoading"
                    />
                  </div>
                  <div class="flex-1 flex flex-col gap-1.5">
                    <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Nom</label>
                    <input
                      v-model="profileForm.last_name"
                      type="text"
                      class="input-field"
                      placeholder="Dupont"
                      :disabled="profileLoading"
                    />
                  </div>
                </div>

                <!-- Email -->
                <div class="flex flex-col gap-1.5">
                  <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Email</label>
                  <input
                    v-model="profileForm.email"
                    type="email"
                    class="input-field"
                    placeholder="jean@exemple.com"
                    :disabled="profileLoading"
                  />
                  <p
                    v-if="profileForm.email.trim() && profileForm.email.trim() !== (user?.email ?? '')"
                    class="text-[11px] text-amber-400 flex items-center gap-1"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    Changer l'email réinitialisera votre vérification.
                  </p>
                </div>

                <!-- Phone -->
                <div class="flex flex-col gap-1.5">
                  <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Téléphone</label>
                  <PhoneInput v-model="profileForm.phone" :disabled="profileLoading" @valid="profilePhoneValid = $event" />
                </div>

                <div class="h-px bg-[var(--glass-border)]" />

                <!-- Street -->
                <div class="flex flex-col gap-1.5">
                  <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Adresse</label>
                  <input
                    v-model="profileForm.street"
                    type="text"
                    class="input-field"
                    placeholder="12 rue de la Paix"
                    :disabled="profileLoading"
                  />
                </div>

                <!-- City + Postal code -->
                <div class="flex gap-3">
                  <div class="flex-1 flex flex-col gap-1.5">
                    <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Ville</label>
                    <input
                      v-model="profileForm.city"
                      type="text"
                      class="input-field"
                      placeholder="Paris"
                      :disabled="profileLoading"
                    />
                  </div>
                  <div class="w-28 flex flex-col gap-1.5">
                    <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Code postal</label>
                    <input
                      v-model="profileForm.postal_code"
                      type="text"
                      class="input-field"
                      placeholder="75001"
                      :disabled="profileLoading"
                    />
                  </div>
                </div>

                <!-- Country -->
                <div class="flex flex-col gap-1.5">
                  <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Pays</label>
                  <input
                    v-model="profileForm.country"
                    type="text"
                    class="input-field"
                    placeholder="France"
                    :disabled="profileLoading"
                  />
                </div>

        <AppButton :full="true" :loading="profileLoading" loading-text="Enregistrement..." @click="handleUpdateProfile">
          Enregistrer
        </AppButton>
      </div>
    </ModalSheet>

    <!-- Logout confirmation dialog -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showLogoutDialog" class="overlay flex items-center justify-center px-6" @click.self="showLogoutDialog = false">
          <Transition name="slide-up">
            <div v-if="showLogoutDialog" class="sheet w-full max-w-[340px] rounded-3xl px-6 py-6 flex flex-col gap-5">
              <!-- Icon -->
              <div class="flex flex-col items-center gap-3 text-center">
                <div class="w-14 h-14 rounded-full bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.25)] flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-base font-bold text-app-primary">Se déconnecter ?</h3>
                  <p class="text-sm text-app-muted mt-1">Vous devrez vous reconnecter pour accéder à l'application.</p>
                </div>
              </div>
              <!-- Actions -->
              <div class="flex flex-col gap-2.5">
                <button
                  class="w-full flex items-center justify-center gap-2 py-3.5 rounded-[14px] bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.3)] text-red-400 text-[15px] font-semibold cursor-pointer transition-colors active:bg-[rgba(239,68,68,0.2)]"
                  @click="confirmLogout"
                >
                  Se déconnecter
                </button>
                <button
                  class="w-full flex items-center justify-center py-3.5 rounded-[14px] glass text-app-muted text-[15px] font-medium cursor-pointer transition-colors active:bg-[var(--glass-bg-hover)]"
                  @click="showLogoutDialog = false"
                >
                  Annuler
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

  </AppLayout>
</template>

