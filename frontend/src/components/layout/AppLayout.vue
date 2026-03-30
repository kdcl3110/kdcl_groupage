<script setup lang="ts">
import { ref } from 'vue'
import AppHeader from './AppHeader.vue'
import TabBar from './TabBar.vue'
import SideNav from './SideNav.vue'
import NotificationDrawer from './NotificationDrawer.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'

const authStore = useAuthStore()
const notifStore = useNotificationStore()

const showNotifications = ref(false)

const userName = authStore.user
  ? `${authStore.user.first_name} ${authStore.user.last_name}`
  : 'Utilisateur'
</script>

<template>
  <SideNav @notification-click="showNotifications = true" />

  <div class="w-full lg:ml-[260px] lg:w-[calc(100%-260px)] min-h-dvh flex flex-col">
    <AppHeader
      :user-name="userName"
      :notification-count="notifStore.unreadCount"
      @notification-click="showNotifications = true"
    />

    <main class="flex-1 pt-16 pb-28 sm:pb-16 lg:pt-0 lg:pb-10 overflow-y-auto scrollbar-hide">
      <slot />
    </main>

    <TabBar />
  </div>

  <NotificationDrawer
    :show="showNotifications"
    @close="showNotifications = false"
  />
</template>
