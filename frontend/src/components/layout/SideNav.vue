<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import { useThemeStore } from '@/stores/theme'

const route = useRoute()
const auth = useAuthStore()
const notifStore = useNotificationStore()
const themeStore = useThemeStore()

const isDark = computed(() => themeStore.theme === 'dark')

const initials = computed(() => {
  if (!auth.user) return '?'
  return (auth.user.first_name[0] + auth.user.last_name[0]).toUpperCase()
})

const roleLabel = computed(() => {
  const map: Record<string, string> = {
    admin: 'Administrateur',
    freight_forwarder: 'Transitaire',
    client: 'Client',
  }
  return map[auth.user?.role ?? ''] ?? ''
})

const navItems = [
  {
    name: 'voyages',
    path: '/voyages',
    label: 'Voyages',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>`,
  },
  {
    name: 'colis',
    path: '/colis',
    label: 'Colis',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>`,
  },
  {
    name: 'destinataires',
    path: '/destinataires',
    label: 'Destinataires',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>`,
  },
  {
    name: 'forum',
    path: '/forum',
    label: 'Forum',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>`,
  },
  {
    name: 'profil',
    path: '/profil',
    label: 'Profil',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>`,
  },
]

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}

defineEmits<{ 'notification-click': [] }>()
</script>

<template>
  <aside class="hidden lg:flex glass flex-col w-[260px] h-dvh fixed left-0 top-0 z-[90] rounded-none border-t-0 border-l-0 border-b-0 border-r border-[var(--glass-border)] p-5 gap-2 overflow-y-auto scrollbar-hide">
    <!-- Logo -->
    <div class="flex items-center gap-2.5 px-2 py-2 pb-4">
      <div class="shrink-0">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="10" fill="url(#sn-logo-grad)" />
          <text x="16" y="21" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="12" fill="white">KG</text>
          <defs>
            <linearGradient id="sn-logo-grad" x1="0" y1="0" x2="32" y2="32">
              <stop offset="0%" style="stop-color: var(--primary-light)"/>
              <stop offset="100%" style="stop-color: var(--primary-dark)"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <span class="text-[15px] font-extrabold bg-gradient-to-br from-[var(--primary-light)] to-[var(--primary-dark)] bg-clip-text text-transparent tracking-tight">KDCL Groupage</span>
    </div>

    <!-- User card -->
    <div class="glass-subtle flex items-center gap-2.5 p-3 rounded-[14px] mb-2">
      <div class="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] glow-primary flex items-center justify-center text-sm font-extrabold text-white shrink-0">
        {{ initials }}
      </div>
      <div class="flex flex-col gap-0.5 overflow-hidden">
        <span class="text-[13px] font-bold text-app-primary truncate">{{ auth.user?.first_name }} {{ auth.user?.last_name }}</span>
        <span class="text-[11px] text-app-muted">{{ roleLabel }}</span>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 flex flex-col gap-0.5">
      <RouterLink
        v-for="item in navItems"
        :key="item.name"
        :to="item.path"
        class="flex items-center gap-3 px-3 py-[11px] rounded-[14px] text-sm font-medium text-app-muted no-underline transition-all duration-150 hover:bg-[var(--glass-bg)] hover:text-app-primary"
        :class="isActive(item.path) ? 'bg-[var(--primary-15)] text-[var(--primary)] font-bold' : ''"
      >
        <span
          class="flex items-center justify-center shrink-0"
          :class="{ 'drop-shadow-[0_0_6px_var(--primary-55)]': isActive(item.path) }"
          v-html="item.icon"
        />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <!-- Bottom actions -->
    <div class="flex flex-col gap-0.5 pt-2 border-t border-[var(--glass-border)]">
      <!-- Notifications -->
      <button
        class="flex items-center gap-3 px-3 py-[11px] rounded-[14px] text-sm font-medium text-app-muted bg-transparent border-none cursor-pointer w-full text-left transition-all duration-150 hover:bg-[var(--glass-bg)] hover:text-app-primary"
        @click="$emit('notification-click')"
      >
        <span class="relative flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span
            v-if="notifStore.unreadCount > 0"
            class="absolute -top-[5px] -right-[5px] min-w-[16px] h-4 bg-[var(--primary)] rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5"
          >
            {{ notifStore.unreadCount > 9 ? '9+' : notifStore.unreadCount }}
          </span>
        </span>
        <span>Notifications</span>
      </button>

      <!-- Theme toggle -->
      <div class="flex items-center gap-3 px-3 py-[11px] rounded-[14px] text-sm font-medium text-app-muted hover:bg-[var(--glass-bg)] transition-all duration-150">
        <span class="flex items-center justify-center shrink-0">
          <svg v-if="!isDark" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </span>
        <span>{{ isDark ? 'Mode sombre' : 'Mode clair' }}</span>
        <label class="theme-toggle ml-auto">
          <input type="checkbox" :checked="!isDark" @change="themeStore.toggle()" />
          <div class="theme-toggle-track">
            <div class="theme-toggle-thumb" />
          </div>
        </label>
      </div>
    </div>
  </aside>
</template>
