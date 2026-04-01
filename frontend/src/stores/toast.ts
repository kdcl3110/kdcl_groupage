import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: number
  message: string
  type: ToastType
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])
  let _nextId = 0

  function show(message: string, type: ToastType = 'info', duration = 4000) {
    const id = ++_nextId
    toasts.value.push({ id, message, type })
    setTimeout(() => remove(id), duration)
  }

  function remove(id: number) {
    const idx = toasts.value.findIndex((t) => t.id === id)
    if (idx !== -1) toasts.value.splice(idx, 1)
  }

  const error   = (msg: string) => show(msg, 'error', 4500)
  const success = (msg: string) => show(msg, 'success', 3000)
  const warning = (msg: string) => show(msg, 'warning', 4000)
  const info    = (msg: string) => show(msg, 'info',    3500)

  return { toasts, show, remove, error, success, warning, info }
})

/** Extract a readable message from an Axios-like error */
export function apiError(err: unknown, fallback = 'Une erreur est survenue.'): string {
  const e = err as { response?: { data?: { message?: string } } }
  return e.response?.data?.message ?? fallback
}
