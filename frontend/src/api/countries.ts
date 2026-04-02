import api from './client'
import type { Country } from '@/types'

export const countriesApi = {
  getAll: () => api.get<Country[]>('/countries'),
  create: (name: string) => api.post<Country>('/countries', { name }),
  update: (id: number, data: { name?: string; is_active?: boolean }) =>
    api.put<Country>(`/countries/${id}`, data),
  remove: (id: number) => api.delete(`/countries/${id}`),
}
