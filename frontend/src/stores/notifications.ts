import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Notification } from '@/types'

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([])
  const unreadCount = computed(() => notifications.value.filter((n) => !n.is_read).length)

  function setNotifications(list: Notification[]) {
    notifications.value = list
  }

  function markAllRead() {
    notifications.value.forEach((n) => (n.is_read = true))
  }

  return { notifications, unreadCount, setNotifications, markAllRead }
})
