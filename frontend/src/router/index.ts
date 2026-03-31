import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/reset-password',
      component: () => import('@/views/ResetPasswordView.vue'),
      meta: { public: true },
    },
    { path: '/', redirect: '/voyages' },
    { path: '/voyages', component: () => import('@/views/VoyagesView.vue') },
    { path: '/voyages/:id', component: () => import('@/views/VoyageDetailView.vue') },
    { path: '/colis', component: () => import('@/views/ColisView.vue') },
    { path: '/destinataires', component: () => import('@/views/DestinatairesView.vue') },
    { path: '/forum', component: () => import('@/views/ForumView.vue') },
    { path: '/profil', component: () => import('@/views/ProfilView.vue') },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) return '/login'
})

export default router
