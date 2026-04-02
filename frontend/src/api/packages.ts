import api from './client'
import type { Package } from '@/types'

export const packagesApi = {
  getAll: (params?: Record<string, string>) => api.get<{ data: Package[]; hasMore: boolean }>('/packages', { params }),
  getById: (id: number) => api.get<Package>(`/packages/${id}`),
  create: (data: FormData) =>
    api.post<{ package: Package; travel_load?: object }>('/packages', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id: number, data: object) => api.put<Package>(`/packages/${id}`, data),
  remove: (id: number) => api.delete(`/packages/${id}`),
  cancel: (id: number) => api.patch(`/packages/${id}/cancel`),
  submit: (id: number, travel_id: number) =>
    api.patch<Package>(`/packages/${id}/submit`, { travel_id }),
  validate: (id: number) =>
    api.patch<{ package: Package; travel_load: object }>(`/packages/${id}/validate`),
  reject: (id: number) => api.patch<Package>(`/packages/${id}/reject`),
  getForManager: (id: number) =>
    api.get<Package>(`/packages/${id}/manager-detail`),
}
