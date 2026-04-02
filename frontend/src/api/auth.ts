import api from './client'
import type { User } from '@/types'


export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/login', { email, password }),
  register: (data: {
    first_name: string
    last_name: string
    email: string
    password: string
    phone: string
    street: string
    city: string
    country: string
    postal_code?: string
    role?: string
  }) => api.post<{ token: string; user: User }>('/auth/register', data),
  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }),
  resetPassword: (token: string, new_password: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, new_password }),
  changePassword: (current_password: string, new_password: string) =>
    api.put<{ message: string }>('/auth/change-password', { current_password, new_password }),
  updateProfile: (data: {
    first_name?: string
    last_name?: string
    phone?: string
    street?: string
    city?: string
    country?: string
    postal_code?: string
  }) => api.put<User>('/auth/profile', data),
}
