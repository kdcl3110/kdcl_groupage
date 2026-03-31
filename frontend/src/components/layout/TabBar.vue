<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const tabs = [
  {
    name: 'voyages',
    path: '/voyages',
    label: 'Voyages',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>`,
  },
  {
    name: 'colis',
    path: '/colis',
    label: 'Colis',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>`,
  },
  {
    name: 'destinataires',
    path: '/destinataires',
    label: 'Contacts',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>`,
  },
  {
    name: 'forum',
    path: '/forum',
    label: 'Forum',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>`,
  },
  {
    name: 'profil',
    path: '/profil',
    label: 'Profil',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>`,
  },
]

function isActive(tab: (typeof tabs)[0]) {
  return route.path === tab.path || route.path.startsWith(tab.path + '/')
}
</script>

<template>
  <nav class="tab-bar lg:hidden">
    <div class="tab-bar__inner">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.name"
        :to="tab.path"
        class="tab-item"
        :class="{ 'tab-item--active': isActive(tab) }"
        :aria-label="tab.label"
      >
        <span
          class="tab-item__icon"
          :class="{ 'tab-item__icon--active': isActive(tab) }"
          v-html="tab.icon"
        />
        <span class="tab-item__label">{{ tab.label }}</span>
        <span v-if="isActive(tab)" class="tab-item__dot" />
      </RouterLink>
    </div>
  </nav>
</template>

<style scoped>
/* ---- Mobile: floating pill ---- */
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 80;
  display: flex;
  justify-content: center;
  padding: 0 16px calc(12px + env(safe-area-inset-bottom, 0px));
  pointer-events: none;
}

.tab-bar__inner {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 8px 10px;
  border-radius: 999px;
  pointer-events: all;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45), var(--glow-primary);
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 6px 12px;
  border-radius: 999px;
  color: var(--text-muted);
  text-decoration: none;
  transition: all 0.2s;
  position: relative;
  min-width: 52px;
}

.tab-item:active { transform: scale(0.91); }
.tab-item--active { color: var(--color-primary); }

.tab-item__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}
.tab-item__icon--active {
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--primary) 70%, transparent));
}

.tab-item__label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.02em;
}
.tab-item--active .tab-item__label { font-weight: 700; }

.tab-item__dot {
  position: absolute;
  bottom: 1px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow: 0 0 6px var(--color-primary);
}

/* ---- Tablet (≥ 640px): full-width bottom bar ---- */
@media (min-width: 640px) {
  .tab-bar {
    padding: 0;
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-top: 1px solid var(--glass-border);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  .tab-bar__inner {
    width: 100%;
    padding: 4px 8px;
    border-radius: 0;
    background: transparent;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    border: none;
    box-shadow: none;
    justify-content: space-around;
    max-width: 800px;
    margin: 0 auto;
  }

  .tab-item {
    min-width: 0;
    flex: 1;
    padding: 8px 4px;
    max-width: 140px;
  }

  .tab-item__label {
    font-size: 12px;
  }
}
</style>
