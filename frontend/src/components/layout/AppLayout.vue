<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from './AppHeader.vue'
import TabBar from './TabBar.vue'
import SideNav from './SideNav.vue'
import NotificationDrawer from './NotificationDrawer.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'

const authStore = useAuthStore()
const notifStore = useNotificationStore()
const route = useRoute()

const showNotifications = ref(false)

const userName = authStore.user
  ? `${authStore.user.first_name} ${authStore.user.last_name}`
  : 'Utilisateur'

const mainPaths = ['/voyages', '/colis', '/destinataires', '/forum', '/profil']
const isMainPage = computed(() => mainPaths.includes(route.path))

// ── SSE lifecycle + Page Visibility ──────────────────────────────────────────

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    // Tab is in background — close the SSE connection to free server resources
    notifStore.disconnect()
  } else {
    // Tab is visible again — reconnect
    notifStore.connect()
  }
}

onMounted(() => {
  notifStore.connect()
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  notifStore.disconnect()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <SideNav @notification-click="showNotifications = true" />

  <div class="w-full lg:ml-[260px] lg:w-[calc(100%-260px)] min-h-dvh flex flex-col">
    <AppHeader
      :user-name="userName"
      :notification-count="notifStore.unreadCount"
      @notification-click="showNotifications = true"
    />

    <main
      class="flex-1 pt-16 lg:pt-0 lg:pb-10 overflow-y-auto scrollbar-hide"
      :class="isMainPage ? 'pb-28 sm:pb-16' : 'pb-6'"
    >
      <slot />
    </main>

    <TabBar />
  </div>

  <NotificationDrawer
    :show="showNotifications"
    @close="showNotifications = false"
  />

</template>
