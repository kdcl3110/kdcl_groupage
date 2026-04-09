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
    {
      path: '/verify-email',
      component: () => import('@/views/VerifyEmailView.vue'),
      meta: { public: true },
    },
    { path: '/', redirect: '/voyages' },
    { path: '/voyages', component: () => import('@/views/VoyagesView.vue') },
    { path: '/voyages/:id', component: () => import('@/views/VoyageDetailView.vue') },
    { path: '/colis', component: () => import('@/views/ColisView.vue') },
    { path: '/colis/:id', component: () => import('@/views/ColisDetailView.vue') },
    { path: '/destinataires', component: () => import('@/views/DestinatairesView.vue') },
    { path: '/forum', component: () => import('@/views/ForumView.vue') },
    { path: '/forum/:id', component: () => import('@/views/ForumChatView.vue') },
    { path: '/profil', component: () => import('@/views/ProfilView.vue') },
    { path: '/groupeur/:id', component: () => import('@/views/GroupeurProfilView.vue'), meta: { public: false } },
    { path: '/aide',                component: () => import('@/views/AideSupportView.vue') },
    { path: '/a-propos',            component: () => import('@/views/AProposView.vue') },
    { path: '/paiement/confirmation', component: () => import('@/views/PaiementConfirmationView.vue'), meta: { public: true } },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) {
    return `/login?redirect=${encodeURIComponent(to.fullPath)}`
  }
})

export default router
