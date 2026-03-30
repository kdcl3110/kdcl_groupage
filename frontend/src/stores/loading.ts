import { ref, computed } from 'vue'

const count = ref(0)
export const isLoading = computed(() => count.value > 0)
export function startLoading() { count.value++ }
export function stopLoading() { if (count.value > 0) count.value-- }
