import api from './client'
import type { Recipient } from '@/types'

export const recipientsApi = {
  getAll: () => api.get<Recipient[]>('/recipients'),
  getById: (id: number) => api.get<Recipient>(`/recipients/${id}`),
  create: (data: object) => api.post<Recipient>('/recipients', data),
  update: (id: number, data: object) => api.put<Recipient>(`/recipients/${id}`, data),
  remove: (id: number) => api.delete(`/recipients/${id}`),
}
