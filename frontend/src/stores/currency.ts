import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { currenciesApi } from '@/api/currencies'
import type { Currency } from '@/types'

const STORAGE_KEY = 'preferredCurrency'
const DEFAULT_CURRENCY = 'USD'

export const useCurrencyStore = defineStore('currency', () => {
  const currencies = ref<Currency[]>([])
  const loaded = ref(false)
  const preferredCode = ref<string>(localStorage.getItem(STORAGE_KEY) ?? DEFAULT_CURRENCY)

  const currentCurrency = computed(
    () => currencies.value.find((c) => c.code === preferredCode.value) ?? null,
  )

  /** Load currencies from the API (idempotent) */
  async function load() {
    if (loaded.value) return
    try {
      const { data } = await currenciesApi.getAll()
      currencies.value = data.data
      loaded.value = true
    } catch {
      // Fail silently — amounts will fall back to raw USD display
    }
  }

  /** Change the user's preferred display currency */
  function setPreferred(code: string) {
    preferredCode.value = code
    localStorage.setItem(STORAGE_KEY, code)
  }

  /**
   * Convert a USD amount to the preferred currency (or a specific one).
   * Returns the raw number — use formatAmount for display.
   */
  function convertFromUsd(amountUsd: number, code?: string): number {
    const targetCode = code ?? preferredCode.value
    const currency = currencies.value.find((c) => c.code === targetCode)
    if (!currency) return amountUsd
    return Math.round(amountUsd * Number(currency.rate_to_usd) * 100) / 100
  }

  /**
   * Format a USD amount for display using the preferred (or specified) currency.
   * Example: formatAmount(45.5) → "€ 41.86" or "27 568 FCFA"
   */
  function formatAmount(amountUsd: number, code?: string): string {
    const targetCode = code ?? preferredCode.value
    const currency = currencies.value.find((c) => c.code === targetCode)

    if (!currency) {
      return `$${amountUsd.toFixed(2)}`
    }

    const converted = Math.round(amountUsd * Number(currency.rate_to_usd) * 100) / 100
    const isZeroDecimal = ['XAF', 'XOF', 'JPY', 'KRW'].includes(targetCode)

    try {
      return new Intl.NumberFormat('fr-FR', {
        style:                 'currency',
        currency:              targetCode,
        minimumFractionDigits: isZeroDecimal ? 0 : 2,
        maximumFractionDigits: isZeroDecimal ? 0 : 2,
      }).format(converted)
    } catch {
      // Fallback if the currency code isn't supported by Intl
      return `${currency.symbol} ${converted.toLocaleString('fr-FR')}`
    }
  }

  return {
    currencies,
    loaded,
    preferredCode,
    currentCurrency,
    load,
    setPreferred,
    convertFromUsd,
    formatAmount,
  }
})
