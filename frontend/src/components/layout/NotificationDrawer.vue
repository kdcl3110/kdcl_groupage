<script setup lang="ts">
import { useNotificationStore } from '@/stores/notifications'

defineProps<{
  show: boolean
}>()

defineEmits<{
  close: []
}>()

const notifStore = useNotificationStore()

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
            class="sheet flex flex-col w-full max-w-[430px] md:max-w-[520px] md:rounded-3xl rounded-t-3xl px-5 pt-6 pb-[calc(24px+env(safe-area-inset-bottom,0px))]"
          >
            <!-- Handle -->
            <div class="w-9 h-1 bg-[rgba(168,19,183,0.3)] rounded-full mx-auto mb-5" />

            <!-- Header -->
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-bold text-app-primary">Notifications</h2>
              <button
                v-if="notifStore.unreadCount > 0"
                class="btn-ghost text-sm py-2 px-4"
                @click="notifStore.markAllRead()"
              >
                Tout lire
              </button>
            </div>

            <!-- Empty -->
            <div v-if="notifStore.notifications.length === 0" class="flex flex-col items-center gap-3 py-12 text-app-muted">
              <span class="text-5xl opacity-40">🔔</span>
              <p class="font-semibold text-app-primary">Aucune notification</p>
              <p class="text-sm text-center">Vous serez notifié des mises à jour importantes ici.</p>
            </div>

            <!-- List -->
            <div v-else class="flex flex-col gap-0.5">
              <div
                v-for="notif in notifStore.notifications"
                :key="notif.notification_id"
                class="flex items-start gap-2.5 px-3 py-3.5 rounded-[14px] transition-colors"
                :class="notif.is_read ? 'bg-transparent' : 'bg-[rgba(168,19,183,0.08)] border border-[rgba(168,19,183,0.15)]'"
              >
                <div
                  v-if="!notif.is_read"
                  class="w-2 h-2 rounded-full bg-[#A813B7] shadow-[0_0_6px_#A813B7] shrink-0 mt-1.5"
                />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-app-primary mb-0.5">{{ notif.title }}</p>
                  <p class="text-[13px] text-app-muted leading-snug mb-1.5">{{ notif.content }}</p>
                  <p class="text-[11px] text-app-faint">{{ formatDate(notif.creation_date) }}</p>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
