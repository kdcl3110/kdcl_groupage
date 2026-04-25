<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: string
}>()

const labelMap: Record<string, string> = {
  // Travel statuses (French)
  open: 'Ouvert',
  full: 'Complet',
  in_transit: 'En transit',
  delivered: 'Livré',
  cancelled: 'Annulé',
  // Package statuses (French)
  pending:          'En attente',
  submitted:        'Soumis',
  awaiting_payment: 'Paiement requis',
  paid:             'Payé',
  in_travel:        'En voyage',
  at_warehouse:     'À l\'entrepôt',
  returned:         'Retourné',
}

const label = computed(() => labelMap[props.status] ?? props.status)
</script>

<template>
  <span class="badge" :class="`badge-${status}`">{{ label }}</span>
</template>
