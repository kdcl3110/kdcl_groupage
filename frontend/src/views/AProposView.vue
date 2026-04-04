<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'

const router = useRouter()
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

      <!-- Hero -->
      <div class="glass rounded-[20px] p-6 flex flex-col items-center gap-3 text-center">
        <div class="w-16 h-16 rounded-[18px] bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-extrabold text-app-primary">KDCL Groupage</h1>
          <p class="text-[13px] text-app-muted mt-0.5">Gestion de fret intelligente</p>
        </div>
        <span class="text-[12px] font-semibold text-[var(--primary)] bg-[var(--primary-10)] border border-[var(--primary-25)] px-3 py-1 rounded-full">
          Version 1.0.0
        </span>
      </div>

      <!-- Infos app -->
      <div class="flex flex-col gap-2">
        <h2 class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em]">Application</h2>
        <div class="glass rounded-[20px] overflow-hidden">

          <div class="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--glass-border)]">
            <div class="w-9 h-9 rounded-[10px] bg-white/[0.06] border border-[var(--glass-border)] flex items-center justify-center text-app-muted shrink-0">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
              </svg>
            </div>
            <div class="flex-1">
              <span class="text-sm font-semibold text-app-primary">Version</span>
            </div>
            <span class="text-sm text-app-muted">1.0.0</span>
          </div>

          <div class="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--glass-border)]">
            <div class="w-9 h-9 rounded-[10px] bg-white/[0.06] border border-[var(--glass-border)] flex items-center justify-center text-app-muted shrink-0">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <div class="flex-1">
              <span class="text-sm font-semibold text-app-primary">Plateforme</span>
            </div>
            <span class="text-sm text-app-muted">Web / PWA</span>
          </div>

          <div class="flex items-center gap-3 px-4 py-3.5">
            <div class="w-9 h-9 rounded-[10px] bg-white/[0.06] border border-[var(--glass-border)] flex items-center justify-center text-app-muted shrink-0">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>
            <div class="flex-1">
              <span class="text-sm font-semibold text-app-primary">Région</span>
            </div>
            <span class="text-sm text-app-muted">Belgique / Afrique</span>
          </div>

        </div>
      </div>

      <!-- Légal -->
      <div class="flex flex-col gap-2">
        <h2 class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em]">Légal</h2>
        <div class="glass rounded-[20px] overflow-hidden">

          <!-- CGU -->
          <div class="border-b border-[var(--glass-border)]">
            <details class="group">
              <summary class="flex items-center gap-3 px-4 py-3.5 cursor-pointer list-none transition-colors active:bg-white/5">
                <div class="w-9 h-9 rounded-[10px] bg-white/[0.06] border border-[var(--glass-border)] flex items-center justify-center text-app-muted shrink-0">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
                <div class="flex-1 flex flex-col gap-0.5">
                  <span class="text-sm font-semibold text-app-primary">Conditions d'utilisation</span>
                  <span class="text-xs text-app-muted">CGU de l'application</span>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-app-faint shrink-0 transition-transform group-open:rotate-180">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </summary>
              <div class="px-4 pb-5 pt-1 flex flex-col gap-3 text-[13px] text-app-muted leading-relaxed">
                <p>En utilisant KDCL Groupage, vous acceptez ces conditions. L'application est réservée aux personnes majeures souhaitant gérer ou participer à des opérations de groupage de fret.</p>
                <p><strong class="text-app-primary">Utilisation du service</strong><br>Vous vous engagez à fournir des informations exactes. Toute fausse déclaration peut entraîner la suspension de votre compte.</p>
                <p><strong class="text-app-primary">Responsabilité</strong><br>KDCL Groupage est un intermédiaire entre clients et transitaires. La responsabilité du transport incombe au transitaire organisateur du voyage.</p>
                <p><strong class="text-app-primary">Modification des CGU</strong><br>Nous nous réservons le droit de modifier ces conditions à tout moment. Les utilisateurs seront notifiés des changements importants.</p>
                <p class="text-[11px] text-app-faint">Dernière mise à jour : Avril 2026</p>
              </div>
            </details>
          </div>

          <!-- Politique de confidentialité -->
          <div>
            <details class="group">
              <summary class="flex items-center gap-3 px-4 py-3.5 cursor-pointer list-none transition-colors active:bg-white/5">
                <div class="w-9 h-9 rounded-[10px] bg-white/[0.06] border border-[var(--glass-border)] flex items-center justify-center text-app-muted shrink-0">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <div class="flex-1 flex flex-col gap-0.5">
                  <span class="text-sm font-semibold text-app-primary">Politique de confidentialité</span>
                  <span class="text-xs text-app-muted">Gestion de vos données</span>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-app-faint shrink-0 transition-transform group-open:rotate-180">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </summary>
              <div class="px-4 pb-5 pt-1 flex flex-col gap-3 text-[13px] text-app-muted leading-relaxed">
                <p>KDCL Groupage collecte uniquement les données nécessaires au bon fonctionnement du service : nom, email, téléphone, adresse et informations relatives à vos colis.</p>
                <p><strong class="text-app-primary">Données collectées</strong><br>Informations de profil, historique des colis et voyages, messages du forum, photos de colis et de profil.</p>
                <p><strong class="text-app-primary">Vos droits (RGPD)</strong><br>Vous pouvez à tout moment demander l'accès, la rectification ou la suppression de vos données : <span class="text-[var(--primary)]">privacy@kdcl-groupage.com</span></p>
                <p><strong class="text-app-primary">Partage</strong><br>Aucune donnée personnelle n'est vendue ou partagée avec des tiers à des fins commerciales.</p>
                <p><strong class="text-app-primary">Conservation</strong><br>Vos données sont conservées le temps de votre relation avec KDCL Groupage, plus 3 ans après la clôture de votre compte.</p>
                <p class="text-[11px] text-app-faint">Dernière mise à jour : Avril 2026</p>
              </div>
            </details>
          </div>

        </div>
      </div>

      <p class="text-[11px] text-app-faint text-center pb-2">© 2026 KDCL Groupage — Tous droits réservés</p>

    </div>
  </AppLayout>
</template>
