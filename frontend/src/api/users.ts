import api from './client'
import type { GroupeurProfile } from '@/types'

export const usersApi = {
  getProfile:            (id: number)   => api.get<GroupeurProfile>(`/users/${id}/profile`),
  uploadAvatar:          (file: File)   => {
    const form = new FormData()
    form.append('avatar', file)
    return api.post<{ profile_picture: string }>('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deleteAvatar:          ()             => api.delete<{ profile_picture: null }>('/users/me/avatar'),
  sendEmailVerification: ()             => api.post<{ message: string }>('/users/me/verify-email/send'),
  verifyEmail:           (token: string) => api.get<{ message: string }>(`/users/verify-email?token=${token}`),
}
