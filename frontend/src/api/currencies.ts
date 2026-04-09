import api from './client'
import type { Currency } from '@/types'

export const currenciesApi = {
  getAll: () => api.get<{ status: string; data: Currency[] }>('/currencies'),
}
