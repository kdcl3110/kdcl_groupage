<script setup lang="ts">
import { watch } from 'vue'
import { useNotificationStore } from '@/stores/notifications'

const props = defineProps<{ show: boolean }>()
defineEmits<{ close: [] }>()

const notifStore = useNotificationStore()

// Refresh notifications each time the drawer opens
watch(() => props.show, (val) => {
  if (val) notifStore.fetch()
})

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="show"
        class="overlay flex items-end md:items-center justify-center"
        @click.self="$emit('close')"
      >
        <Transition name="slide-up">
          <div
            v-if="show"
            class="sheet flex flex-col w-full max-w-[430px] md:max-w-[520px] md:rounded-3xl rounded-t-3xl"
            style="max-height: 85dvh;"
          >
            <!-- Handle -->
            <div class="w-9 h-1 bg-[var(--primary-30)] rounded-full mx-auto mt-5 mb-1 shrink-0" />

            <!-- Header -->
            <div class="flex items-center justify-between px-5 py-4 shrink-0">
              <h2 class="text-lg font-bold text-app-primary">Notifications</h2>
              <button
                v-if="notifStore.unreadCount > 0"
                class="btn-ghost text-sm py-2 px-4"
                @click="notifStore.markAllRead()"
              >
                Tout lire
              </button>
            </div>

            <div class="border-t border-[var(--glass-border)] shrink-0" />

            <!-- Empty -->
            <div
              v-if="notifStore.notifications.length === 0"
              class="flex flex-col items-center gap-3 py-16 px-5 text-app-muted"
            >
              <div class="w-16 h-16 rounded-full bg-white/[0.05] border border-[var(--glass-border)] flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-app-faint">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </div>
              <p class="font-semibold text-app-primary">Aucune notification</p>
              <p class="text-sm text-center">Vous serez notifié des mises à jour importantes ici.</p>
            </div>

            <!-- List -->
            <div v-else class="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5 scrollbar-hide pb-[calc(12px+env(safe-area-inset-bottom,0px))]">
              <button
                v-for="notif in notifStore.notifications"
                :key="notif.notification_id"
                class="w-full text-left flex items-start gap-3 px-3 py-3.5 rounded-[14px] transition-colors cursor-pointer border border-transparent"
                :class="notif.is_read
                  ? 'bg-transparent hover:bg-white/[0.03]'
                  : 'bg-[var(--primary-10)] border-[var(--primary-15)] hover:bg-[var(--primary-15)]'"
                @click="notifStore.markRead(notif.notification_id)"
              >
                <!-- Unread dot -->
                <div class="shrink-0 mt-1.5 w-2">
                  <div
                    v-if="!notif.is_read"
                    class="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_6px_var(--primary)]"
                  />
                </div>

                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-app-primary mb-0.5">{{ notif.title }}</p>
                  <p class="text-[13px] text-app-muted leading-snug mb-1.5">{{ notif.content }}</p>
                  <p class="text-[11px] text-app-faint">{{ formatDate(notif.creation_date) }}</p>
                </div>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
