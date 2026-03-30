<script setup lang="ts">
defineProps<{
  userName: string
  notificationCount?: number
}>()

defineEmits<{
  'notification-click': []
}>()
</script>

<template>
  <header class="glass fixed inset-x-0 top-0 lg:sticky lg:left-auto lg:w-full h-16 flex items-center justify-between px-5 z-[80] rounded-none border-x-0 border-t-0 border-b border-[var(--glass-border)]">
    <!-- Logo -->
    <div class="flex items-center gap-2">
      <div class="shrink-0">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="8" fill="url(#header-logo-grad)" />
          <text x="14" y="19" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="11" fill="white">KG</text>
          <defs>
            <linearGradient id="header-logo-grad" x1="0" y1="0" x2="28" y2="28">
              <stop offset="0%" stop-color="#c91fd6"/>
              <stop offset="100%" stop-color="#8a0f97"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <span class="text-base font-extrabold bg-gradient-to-br from-[#c91fd6] to-[#8a0f97] bg-clip-text text-transparent tracking-tight">KDCL</span>
    </div>

    <!-- Username centered -->
    <div class="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-app-primary">{{ userName }}</div>

    <!-- Notification bell -->
    <button
      class="relative w-10 h-10 rounded-full glass flex items-center justify-center text-app-primary transition-all active:scale-95 shrink-0"
      @click="$emit('notification-click')"
      aria-label="Notifications"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span
        v-if="notificationCount && notificationCount > 0"
        class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#A813B7] rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1 shadow-[0_0_8px_rgba(168,19,183,0.6)]"
      >
        {{ notificationCount > 9 ? '9+' : notificationCount }}
      </span>
    </button>
  </header>
</template>
