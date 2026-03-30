import api from './client'
import type { Travel, ForumMessage } from '@/types'

export const travelsApi = {
  getAll: (params?: Record<string, string>) => api.get<Travel[]>('/travels', { params }),
  getById: (id: number) => api.get<Travel>(`/travels/${id}`),
  create: (data: object) => api.post<Travel>('/travels', data),
  update: (id: number, data: object) => api.put<Travel>(`/travels/${id}`, data),
  updateStatus: (id: number, status: string) =>
    api.put(`/travels/${id}/status`, { status }),
  getForumMessages: (id: number) => api.get<ForumMessage[]>(`/travels/${id}/forum`),
  postForumMessage: (id: number, content: string, parent_message_id?: number) =>
    api.post<ForumMessage>(`/travels/${id}/forum`, { content, parent_message_id }),
}
