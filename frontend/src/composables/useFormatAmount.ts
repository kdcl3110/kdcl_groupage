import { computed, type ComputedRef } from 'vue'
import { useCurrencyStore } from '@/stores/currency'

/**
 * Returns a computed string that formats a USD amount into the user's
 * preferred display currency (reactive — updates when the user changes currency).
 *
 * Usage:
 *   const formatted = useFormatAmount(() => pkg.value?.price ?? 0)
 *   // In template: {{ formatted }}
 */
export function useFormatAmount(getAmountUsd: () => number | null | undefined): ComputedRef<string> {
  const currencyStore = useCurrencyStore()

  return computed(() => {
    const amount = getAmountUsd()
    if (amount == null) return '—'
    return currencyStore.formatAmount(amount)
  })
}
