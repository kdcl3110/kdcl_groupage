<script setup lang="ts">
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()

const icons: Record<string, string> = {
  success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  info:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
}

const colors: Record<string, { border: string; icon: string; bg: string }> = {
  success: { border: 'rgba(34,197,94,0.35)',   icon: '#4ade80', bg: 'rgba(34,197,94,0.12)' },
  error:   { border: 'rgba(239,68,68,0.35)',   icon: '#f87171', bg: 'rgba(239,68,68,0.12)' },
  warning: { border: 'rgba(234,179,8,0.35)',   icon: '#fbbf24', bg: 'rgba(234,179,8,0.12)' },
  info:    { border: 'rgba(129,166,198,0.35)', icon: '#81A6C6', bg: 'rgba(129,166,198,0.12)' },
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-stack">
      <TransitionGroup name="toast">
        <div
          v-for="t in toast.toasts"
          :key="t.id"
          class="toast-item"
          :style="{
            background: colors[t.type].bg,
            borderColor: colors[t.type].border,
          }"
          @click="toast.remove(t.id)"
        >
          <span
            class="toast-icon"
            :style="{ color: colors[t.type].icon }"
            v-html="icons[t.type]"
          />
          <span class="toast-message">{{ t.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  z-index: 500;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 8.5rem);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 8px;
  pointer-events: none;
  width: max-content;
  max-width: calc(100vw - 32px);
}

@media (min-width: 640px) {
  .toast-stack { bottom: calc(env(safe-area-inset-bottom, 0px) + 5.5rem); }
}

@media (min-width: 1024px) {
  .toast-stack {
    bottom: 1.5rem;
    right: 1.5rem;
    left: auto;
    transform: none;
    align-items: flex-end;
  }
}

.toast-item {
  pointer-events: all;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 16px;
  border-radius: 14px;
  border: 1px solid;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  max-width: 360px;
  min-width: 220px;
}

.toast-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  line-height: 0;
}

.toast-message {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.4;
}

/* Transitions */
.toast-enter-active { transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1); }
.toast-leave-active { transition: all 0.22s ease; }
.toast-enter-from   { opacity: 0; transform: translateY(12px) scale(0.94); }
.toast-leave-to     { opacity: 0; transform: translateY(-6px) scale(0.96); }
.toast-move         { transition: transform 0.25s ease; }
</style>
