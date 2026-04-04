<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'

const router = useRouter()

const openFaq = ref<number | null>(null)

const faqs = [
  {
    q: 'Comment soumettre un colis ?',
    a: 'Rendez-vous dans l\'onglet « Colis », créez un colis puis ouvrez le détail d\'un voyage ouvert et appuyez sur « Soumettre un colis ».',
  },
  {
    q: 'Comment suivre mon colis ?',
    a: 'Dans l\'onglet « Colis », sélectionnez votre colis pour voir son statut en temps réel ainsi que le voyage associé.',
  },
  {
    q: 'À quoi sert le forum ?',
    a: 'Le forum permet aux transitaires de communiquer des informations importantes sur un voyage à tous les clients participants (retards, mises à jour, etc.).',
  },
  {
    q: 'Comment contacter mon transitaire ?',
    a: 'Ouvrez le détail d\'un voyage, la carte du transitaire vous donne ses coordonnées directes. Vous pouvez également écrire via le forum du voyage.',
  },
  {
    q: 'Que faire si mon colis est en retard ?',
    a: 'Consultez le forum du voyage pour les dernières mises à jour du transitaire. Si le problème persiste, contactez directement le support.',
  },
  {
    q: 'Puis-je retirer la soumission d\'un colis ?',
    a: 'Oui, tant que le transitaire n\'a pas encore validé votre colis (statut « Soumis »), vous pouvez le retirer depuis le détail du colis.',
  },
  {
    q: 'Comment est calculé le prix de mon colis ?',
    a: 'Le prix est calculé par le transitaire en fonction du poids (avion) ou du volume (bateau), multiplié par un coefficient selon la fragilité du colis. Il vous est confirmé lors de la validation.',
  },
]

function toggleFaq(i: number) {
  openFaq.value = openFaq.value === i ? null : i
}
</script>

<template>
  <AppLayout>
    <div class="p-4 sm:p-6 flex flex-col gap-5 max-w-2xl lg:mx-auto">

      <!-- Header -->
      <div class="flex items-center gap-3">
        <button
          class="flex items-center gap-1.5 text-sm text-app-muted cursor-pointer bg-transparent border-none p-0 transition-colors hover:text-app-primary"
          @click="router.back()"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Retour
        </button>
      </div>

      <div>
        <h1 class="text-2xl font-extrabold text-app-primary tracking-tight">Aide et support</h1>
        <p class="text-[13px] text-app-muted mt-0.5">FAQ, contact et signalement de problèmes</p>
      </div>

      <!-- Contacter le support -->
      <div class="flex flex-col gap-2">
        <h2 class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em]">Nous contacter</h2>
        <div class="glass rounded-[20px] overflow-hidden">

          <a
            href="mailto:support@kdcl-groupage.com"
            class="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-white/5 no-underline border-b border-[var(--glass-border)]"
          >
            <div class="w-9 h-9 rounded-[10px] bg-[var(--primary-10)] border border-[var(--primary-25)] flex items-center justify-center shrink-0">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="text-[var(--primary)]">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div class="flex-1 flex flex-col gap-0.5">
              <span class="text-sm font-semibold text-app-primary">Email support</span>
              <span class="text-xs text-app-muted">support@kdcl-groupage.com</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-app-faint shrink-0">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </a>

          <a
            href="https://wa.me/message/KDCLSUPPORT"
            target="_blank"
            rel="noopener"
            class="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-white/5 no-underline border-b border-[var(--glass-border)]"
          >
            <div class="w-9 h-9 rounded-[10px] bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" class="text-green-400">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.129.558 4.122 1.532 5.853L.05 23.5l5.818-1.525A11.954 11.954 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.884 0-3.65-.497-5.179-1.367l-.37-.22-3.452.905.921-3.361-.24-.385A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
            </div>
            <div class="flex-1 flex flex-col gap-0.5">
              <span class="text-sm font-semibold text-app-primary">WhatsApp</span>
              <span class="text-xs text-app-muted">Réponse sous 24h</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-app-faint shrink-0">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </a>

          <a
            href="mailto:support@kdcl-groupage.com?subject=Signalement%20d%27un%20probl%C3%A8me"
            class="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-white/5 no-underline"
          >
            <div class="w-9 h-9 rounded-[10px] bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="text-red-400">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div class="flex-1 flex flex-col gap-0.5">
              <span class="text-sm font-semibold text-app-primary">Signaler un problème</span>
              <span class="text-xs text-app-muted">Envoyer un rapport à l'équipe</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-app-faint shrink-0">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </a>
        </div>
        <p class="text-[11px] text-app-faint px-1">Disponible du lundi au vendredi, 9h – 18h (CET)</p>
      </div>

      <!-- FAQ -->
      <div class="flex flex-col gap-2">
        <h2 class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em]">Questions fréquentes</h2>
        <div class="glass rounded-[20px] overflow-hidden">
          <div
            v-for="(item, i) in faqs"
            :key="i"
            class="border-b border-[var(--glass-border)] last:border-none"
          >
            <button
              class="w-full flex items-center justify-between gap-3 px-4 py-4 text-left cursor-pointer bg-transparent border-none transition-colors active:bg-white/5"
              @click="toggleFaq(i)"
            >
              <span class="text-[14px] font-semibold text-app-primary">{{ item.q }}</span>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                class="text-app-faint shrink-0 transition-transform duration-200"
                :class="openFaq === i ? 'rotate-180' : ''"
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div v-if="openFaq === i" class="px-4 pb-4">
              <p class="text-[13px] text-app-muted leading-relaxed">{{ item.a }}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  </AppLayout>
</template>
