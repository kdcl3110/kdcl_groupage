import api from './client'
import type { Travel, ForumMessage, ForumParticipant } from '@/types'

export const travelsApi = {
  getAll: (params?: Record<string, string>) => api.get<{ data: Travel[]; hasMore: boolean }>('/travels', { params }),
  getById: (id: number) => api.get<Travel>(`/travels/${id}`),
  create: (data: object) => api.post<Travel>('/travels', data),
  update: (id: number, data: object) => api.put<Travel>(`/travels/${id}`, data),
  updateStatus: (id: number, status: string, targetTravelId?: number) =>
    api.put(`/travels/${id}/status`, { status, ...(targetTravelId ? { target_travel_id: targetTravelId } : {}) }),
  getForumMessages: (id: number) =>
    api.get<{ messages: ForumMessage[]; participants?: ForumParticipant[] }>(`/travels/${id}/forum`),
  getForumUnreadCount: (id: number) => api.get<{ count: number }>(`/travels/${id}/forum/unread`),
  postForumMessage: (id: number, content: string, parent_message_id?: number) =>
    api.post<ForumMessage>(`/travels/${id}/forum`, { content, parent_message_id }),
}
