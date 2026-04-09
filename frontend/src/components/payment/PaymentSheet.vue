<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ModalSheet from '@/components/common/ModalSheet.vue'
import AppButton from '@/components/common/AppButton.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import { useCurrencyStore } from '@/stores/currency'
import { paymentsApi } from '@/api/payments'
import { apiError } from '@/stores/toast'

const props = defineProps<{
  packageId: number
  amountUsd: number
  deadlineAt: string
}>()

const emit = defineEmits<{
  paid: []
}>()

const open = defineModel<boolean>({ required: true })

const currencyStore = useCurrencyStore()
const selectedCurrency = ref(currencyStore.preferredCode)
const loading = ref(false)
const error = ref('')
const stripeClientSecret = ref<string | null>(null)

// Available currencies for payment (EUR via Stripe, XAF via Notchpay)
const PAYMENT_CURRENCIES = ['EUR', 'XAF', 'USD', 'GBP', 'CAD']
const availableCurrencies = computed(() =>
  currencyStore.currencies.filter((c) => PAYMENT_CURRENCIES.includes(c.code)),
)

// Deadline countdown
const timeLeft = computed(() => {
  const diff = new Date(props.deadlineAt).getTime() - Date.now()
  if (diff <= 0) return 'Délai expiré'
  const hours   = Math.floor(diff / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  if (hours > 0) return `${hours}h ${minutes}min restantes`
  return `${minutes} minutes restantes`
})

const isExpired = computed(() => new Date(props.deadlineAt).getTime() <= Date.now())

// Converted amount preview
const amountPreview = computed(() => {
  if (!selectedCurrency.value) return null
  return currencyStore.formatAmount(props.amountUsd, selectedCurrency.value)
})

// Provider label
const providerLabel = computed(() => {
  return ['XAF', 'XOF'].includes(selectedCurrency.value)
    ? 'MTN MoMo / Orange Money via Notchpay'
    : 'Carte bancaire via Stripe'
})

watch(open, (val) => {
  if (!val) {
    error.value = ''
    stripeClientSecret.value = null
    loading.value = false
  } else {
    selectedCurrency.value = currencyStore.preferredCode
    currencyStore.load()
  }
})

async function handlePay() {
  if (!selectedCurrency.value || isExpired.value) return
  error.value = ''
  stripeClientSecret.value = null
  loading.value = true
  try {
    const { data } = await paymentsApi.initiate(props.packageId, selectedCurrency.value)
    const result = data.data

    if (result.redirectUrl) {
      // Notchpay: redirect to payment page
      window.location.href = result.redirectUrl
    } else if (result.clientSecret) {
      // Stripe: show client secret (Stripe.js integration to be added)
      stripeClientSecret.value = result.clientSecret
    }
  } catch (err) {
    error.value = apiError(err, 'Impossible d\'initier le paiement. Veuillez réessayer.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <ModalSheet v-model="open" title="Payer mon colis">
    <template #header>
      <div class="flex items-center gap-3 px-4 py-3 border-b border-[var(--glass-border)]">
        <button @click="open = false" class="p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer border-none bg-transparent">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-app-muted">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span class="text-[15px] font-bold text-app-primary">Payer mon colis</span>
      </div>
    </template>

    <div class="px-4 py-5 flex flex-col gap-5">

      <!-- Deadline banner -->
      <div
        class="flex items-center gap-3 rounded-[14px] px-4 py-3"
        :class="isExpired ? 'bg-red-500/10 border border-red-500/30' : 'bg-amber-500/10 border border-amber-500/30'"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          :class="isExpired ? 'text-red-400' : 'text-amber-400'">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <span class="text-[13px] font-medium" :class="isExpired ? 'text-red-400' : 'text-amber-300'">
          {{ isExpired ? 'Le délai de paiement a expiré.' : timeLeft }}
        </span>
      </div>

      <!-- Amount -->
      <div class="glass rounded-[16px] p-4 flex flex-col gap-1 text-center">
        <span class="text-[12px] text-app-muted font-semibold uppercase tracking-[0.06em]">Montant à payer</span>
        <span class="text-[28px] font-extrabold text-app-primary">
          {{ amountPreview ?? `$${amountUsd.toFixed(2)}` }}
        </span>
        <span class="text-[11px] text-app-faint">{{ providerLabel }}</span>
      </div>

      <!-- Currency selector -->
      <div class="flex flex-col gap-2">
        <span class="text-[11px] font-semibold text-app-muted uppercase tracking-[0.06em]">Devise de paiement</span>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="c in availableCurrencies"
            :key="c.code"
            class="px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-colors cursor-pointer"
            :class="selectedCurrency === c.code
              ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
              : 'bg-transparent text-app-muted border-[var(--glass-border)] hover:border-[var(--primary-35)]'"
            @click="selectedCurrency = c.code"
          >
            {{ c.symbol }} {{ c.code }}
          </button>
        </div>
      </div>

      <!-- Stripe placeholder (after intent creation) -->
      <div v-if="stripeClientSecret" class="glass rounded-[14px] p-4 flex flex-col gap-2">
        <p class="text-[13px] font-semibold text-app-primary">Paiement Stripe initié</p>
        <p class="text-[12px] text-app-muted">
          L'intégration Stripe.js arrive bientôt. En attendant, utilisez le client secret
          ci-dessous via le dashboard Stripe ou l'application Stripe.
        </p>
        <code class="text-[10px] text-app-faint break-all select-all">{{ stripeClientSecret }}</code>
      </div>

      <ErrorAlert v-if="error" :message="error" />
    </div>

    <template #footer>
      <AppButton
        class="w-full"
        :loading="loading"
        loading-text="Connexion au prestataire..."
        :disabled="isExpired || !selectedCurrency"
        @click="handlePay"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
          <line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
        Payer maintenant
      </AppButton>
    </template>
  </ModalSheet>
</template>
