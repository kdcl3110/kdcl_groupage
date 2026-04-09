<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import { paymentsApi } from '@/api/payments'

const route = useRoute()
const router = useRouter()

// Notchpay sends: ?reference=xxx&status=complete|failed|cancelled
const reference = computed(() => route.query['reference'] as string | undefined)
const status    = computed(() => route.query['status']    as string | undefined)

const loading   = ref(false)
const verified  = ref(false)
const failed    = ref(false)
const packageId = ref<number | null>(null)

// Map Notchpay status strings to a normalised result
const isSuccess = computed(() => status.value === 'complete' || status.value === 'successful')
const isFailed  = computed(() => status.value === 'failed' || status.value === 'cancelled')

onMounted(async () => {
  if (!reference.value) {
    failed.value = true
    return
  }

  if (isSuccess.value) {
    // The webhook already processed the payment server-side.
    // We just try to look up which package it belongs to so we can redirect.
    loading.value = true
    try {
      const { data } = await paymentsApi.getByReference(reference.value)
      packageId.value = data.data?.package_id ?? null
      verified.value = true
    } catch {
      // Non-blocking — the payment was already processed via webhook
      verified.value = true
    } finally {
      loading.value = false
    }
  } else if (isFailed.value) {
    failed.value = true
  }
})

function goToPackage() {
  if (packageId.value) {
    router.push(`/colis/${packageId.value}`)
  } else {
    router.push('/colis')
  }
}
</script>

<template>
  <AppLayout>
    <div class="flex flex-col items-center justify-center min-h-[70dvh] px-6 py-12 text-center gap-6">

      <!-- Loading -->
      <template v-if="loading">
        <div class="w-14 h-14 rounded-full border-2 border-[var(--primary-35)] border-t-[var(--primary)] animate-spin" />
        <p class="text-app-muted text-sm">Vérification du paiement…</p>
      </template>

      <!-- Success -->
      <template v-else-if="verified">
        <div class="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-400">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div class="flex flex-col gap-1.5">
          <h1 class="text-[22px] font-extrabold text-app-primary">Paiement confirmé !</h1>
          <p class="text-sm text-app-muted max-w-[300px]">
            Votre paiement a bien été reçu. Votre colis est maintenant marqué comme payé.
          </p>
        </div>
        <button
          @click="goToPackage"
          class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[var(--primary)] text-white text-[15px] font-semibold cursor-pointer border-none transition-opacity active:opacity-80"
        >
          Voir mon colis
        </button>
      </template>

      <!-- Failed / cancelled -->
      <template v-else-if="failed || isFailed">
        <div class="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-400">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <div class="flex flex-col gap-1.5">
          <h1 class="text-[22px] font-extrabold text-app-primary">Paiement échoué</h1>
          <p class="text-sm text-app-muted max-w-[300px]">
            Le paiement n'a pas abouti. Vous pouvez réessayer depuis la page de votre colis.
          </p>
        </div>
        <button
          @click="router.push('/colis')"
          class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-transparent text-[var(--primary)] border-[1.5px] border-[var(--primary)] text-[15px] font-semibold cursor-pointer transition-colors hover:bg-[var(--primary-10)]"
        >
          Retour à mes colis
        </button>
      </template>

      <!-- Unknown state -->
      <template v-else>
        <p class="text-app-muted text-sm">État de paiement inconnu.</p>
        <button @click="router.push('/colis')" class="text-[var(--primary)] text-sm font-semibold cursor-pointer bg-transparent border-none">
          Retour à mes colis
        </button>
      </template>

    </div>
  </AppLayout>
</template>
