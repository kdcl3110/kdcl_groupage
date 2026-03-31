<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { authApi } from '@/api/auth'

const router = useRouter()
const auth = useAuthStore()
const themeStore = useThemeStore()

const showLogoutDialog = ref(false)

// ── Change password sheet ─────────────────────────────────────────────────
const showPasswordSheet = ref(false)
const pwForm = reactive({ current: '', next: '', confirm: '' })
const pwError = ref('')
const pwLoading = ref(false)
const pwSuccess = ref(false)
const showCurrent = ref(false)
const showNext = ref(false)
const showConfirm = ref(false)

const passwordStrength = computed(() => {
  const p = pwForm.next
  if (!p) return 0
  let score = 0
  if (p.length >= 8) score++
  if (/[A-Z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  return score
})
const strengthLabel = computed(() => ['', 'Faible', 'Moyen', 'Bon', 'Fort'][passwordStrength.value] ?? '')
const strengthColor = computed(() => ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400'][passwordStrength.value] ?? '')
const strengthTextColor = computed(() => strengthColor.value.replace('bg-', 'text-'))

function openPasswordSheet() {
  pwForm.current = ''
  pwForm.next = ''
  pwForm.confirm = ''
  pwError.value = ''
  pwSuccess.value = false
  showCurrent.value = false
  showNext.value = false
  showConfirm.value = false
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
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    pwError.value = e.response?.data?.message ?? 'Erreur lors du changement de mot de passe.'
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
    <div class="p-4 sm:p-6 lg:p-8 flex flex-col gap-5 max-w-2xl lg:mx-auto">
      <!-- Avatar / Hero -->
      <div class="glass rounded-[20px] relative overflow-hidden flex flex-col items-center gap-3 px-5 py-7 text-center">
        <!-- Glow -->
        <div class="absolute -top-[60px] left-1/2 -translate-x-1/2 w-[200px] h-[200px] bg-[radial-gradient(circle,var(--primary-30)_0%,transparent_70%)] pointer-events-none" />
        <!-- Avatar -->
        <div class="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] glow-primary border-2 border-white/15 flex items-center justify-center text-2xl font-extrabold text-white z-10">
          {{ initials }}
        </div>
        <!-- Info -->
        <div class="flex flex-col items-center gap-1.5 z-10">
          <h1 class="text-xl font-extrabold text-app-primary tracking-tight">{{ user?.first_name }} {{ user?.last_name }}</h1>
          <div
            class="text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-[0.04em]"
            :class="roleBadgeClass"
          >{{ roleLabel }}</div>
          <p class="text-[13px] text-app-muted">{{ user?.email }}</p>
        </div>
      </div>

      <!-- Compte -->
      <div class="flex flex-col gap-2">
        <h2 class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em]">Compte</h2>
        <div class="glass rounded-[20px] overflow-hidden">
          <div class="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors active:bg-white/5">
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

      <!-- À propos -->
      <div class="flex flex-col gap-2">
        <h2 class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em]">À propos</h2>
        <div class="glass rounded-[20px] overflow-hidden">
          <div class="flex items-center gap-3 px-4 py-3.5">
            <div class="w-9 h-9 rounded-[10px] bg-white/[0.06] border border-[var(--glass-border)] flex items-center justify-center text-app-muted shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div class="flex-1 flex flex-col gap-0.5">
              <span class="text-sm font-semibold text-app-primary">Version</span>
              <span class="text-xs text-app-muted">KDCL Groupage v0.0.1</span>
            </div>
          </div>
        </div>
      </div>

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
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showPasswordSheet" class="overlay flex items-end md:items-center justify-center" @click.self="showPasswordSheet = false">
          <Transition name="slide-up">
            <div v-if="showPasswordSheet" class="sheet w-full max-w-[480px] md:rounded-3xl rounded-t-3xl flex flex-col" style="max-height: 92dvh;">
              <!-- Handle -->
              <div class="w-9 h-1 bg-[var(--primary-30)] rounded-full mx-auto mt-4 shrink-0" />

              <!-- Header -->
              <div class="flex items-center justify-between px-5 pt-4 pb-4 shrink-0">
                <h2 class="text-[17px] font-bold text-app-primary">Changer le mot de passe</h2>
                <button
                  class="w-8 h-8 rounded-full glass flex items-center justify-center text-app-muted cursor-pointer"
                  @click="showPasswordSheet = false"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <!-- Content -->
              <div class="flex-1 overflow-y-auto px-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] flex flex-col gap-4">

                <!-- Success -->
                <template v-if="pwSuccess">
                  <div class="flex flex-col items-center gap-4 py-8 text-center">
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
                  <button class="btn-primary w-full" @click="showPasswordSheet = false">Fermer</button>
                </template>

                <!-- Form -->
                <template v-else>
                  <!-- Current password -->
                  <div class="flex flex-col gap-1.5">
                    <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Mot de passe actuel</label>
                    <div class="relative">
                      <input
                        v-model="pwForm.current"
                        :type="showCurrent ? 'text' : 'password'"
                        class="input-field"
                        placeholder="••••••••"
                        autocomplete="current-password"
                        :disabled="pwLoading"
                        style="padding-right: 44px;"
                      />
                      <button
                        type="button"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-app-faint hover:text-app-muted transition-colors cursor-pointer bg-transparent border-none p-1"
                        @click="showCurrent = !showCurrent"
                        tabindex="-1"
                      >
                        <svg v-if="showCurrent" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <!-- Divider -->
                  <div class="h-px bg-[var(--glass-border)]" />

                  <!-- New password -->
                  <div class="flex flex-col gap-1.5">
                    <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Nouveau mot de passe</label>
                    <div class="relative">
                      <input
                        v-model="pwForm.next"
                        :type="showNext ? 'text' : 'password'"
                        class="input-field"
                        placeholder="Minimum 8 caractères"
                        autocomplete="new-password"
                        :disabled="pwLoading"
                        style="padding-right: 44px;"
                      />
                      <button
                        type="button"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-app-faint hover:text-app-muted transition-colors cursor-pointer bg-transparent border-none p-1"
                        @click="showNext = !showNext"
                        tabindex="-1"
                      >
                        <svg v-if="showNext" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                    <div v-if="pwForm.next" class="flex flex-col gap-1 mt-0.5">
                      <div class="flex gap-1">
                        <div
                          v-for="i in 4" :key="i"
                          class="flex-1 h-1 rounded-full transition-all duration-300"
                          :class="i <= passwordStrength ? strengthColor : 'bg-white/10'"
                        />
                      </div>
                      <p class="text-[11px]" :class="strengthTextColor">{{ strengthLabel }}</p>
                    </div>
                  </div>

                  <!-- Confirm password -->
                  <div class="flex flex-col gap-1.5">
                    <label class="text-[13px] font-medium text-app-muted uppercase tracking-[0.05em]">Confirmer le nouveau mot de passe</label>
                    <div class="relative">
                      <input
                        v-model="pwForm.confirm"
                        :type="showConfirm ? 'text' : 'password'"
                        class="input-field"
                        placeholder="••••••••"
                        autocomplete="new-password"
                        :disabled="pwLoading"
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

                  <Transition name="fade">
                    <div v-if="pwError" class="flex items-center gap-2 px-3.5 py-2.5 bg-red-500/10 border border-red-500/25 rounded-[10px] text-[13px] text-red-400">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      {{ pwError }}
                    </div>
                  </Transition>

                  <button class="btn-primary w-full" @click="handleChangePassword" :disabled="pwLoading">
                    <span v-if="pwLoading" class="btn-spinner" />
                    <span v-else>Mettre à jour le mot de passe</span>
                  </button>
                </template>

              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

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
