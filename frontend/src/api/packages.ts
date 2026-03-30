import api from './client'
import type { Package } from '@/types'

export const packagesApi = {
  getAll: (params?: Record<string, string>) => api.get<Package[]>('/packages', { params }),
  getById: (id: number) => api.get<Package>(`/packages/${id}`),
  create: (data: object) =>
    api.post<{ package: Package; travel_load?: object }>('/packages', data),
  update: (id: number, data: object) => api.put<Package>(`/packages/${id}`, data),
  remove: (id: number) => api.delete(`/packages/${id}`),
  cancel: (id: number) => api.patch(`/packages/${id}/cancel`),
  submit: (id: number, travel_id: number) =>
    api.patch(`/packages/${id}/submit`, { travel_id }),
}
