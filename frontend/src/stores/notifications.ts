import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { notificationsApi } from '@/api/notifications'
import type { Notification } from '@/types'

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([])
  const unreadCount = computed(() => notifications.value.filter((n) => !n.is_read).length)

  let source: EventSource | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  // ── SSE connection ────────────────────────────────────────────────────────

  function connect() {
    const token = localStorage.getItem('token')
    if (!token) return
    if (source) return // already connected

    source = new EventSource(
      `/api/v1/notifications/stream?token=${encodeURIComponent(token)}`,
    )

    // Initial load — server sends the full list as the first event
    source.addEventListener('init', (e: MessageEvent) => {
      notifications.value = JSON.parse(e.data)
    })

    // New notification pushed by the server
    source.addEventListener('new', (e: MessageEvent) => {
      const notif: Notification = JSON.parse(e.data)
      if (!notifications.value.some((n) => n.notification_id === notif.notification_id)) {
        notifications.value.unshift(notif)
      }
    })

    // On error (network loss, server restart…): close and schedule reconnect
    source.onerror = () => {
      _close()
      reconnectTimer = setTimeout(() => {
        if (document.visibilityState !== 'hidden') connect()
      }, 5_000)
    }
  }

  function disconnect() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    _close()
  }

  function _close() {
    if (source) { source.close(); source = null }
  }

  // ── Fallback HTTP fetch (used by the drawer on open) ─────────────────────

  async function fetch() {
    try {
      const { data } = await notificationsApi.getAll()
      notifications.value = data
    } catch {
      // silent
    }
  }

  // ── Mark read ─────────────────────────────────────────────────────────────

  async function markRead(id: number) {
    const notif = notifications.value.find((n) => n.notification_id === id)
    if (!notif || notif.is_read) return
    notif.is_read = true // optimistic
    try {
      await notificationsApi.markRead(id)
    } catch {
      notif.is_read = false // rollback
    }
  }

  async function markAllRead() {
    if (!notifications.value.some((n) => !n.is_read)) return
    notifications.value.forEach((n) => (n.is_read = true)) // optimistic
    try {
      await notificationsApi.markAllRead()
    } catch {
      await fetch() // rollback by re-fetching real state
    }
  }

  return { notifications, unreadCount, connect, disconnect, fetch, markRead, markAllRead }
})
