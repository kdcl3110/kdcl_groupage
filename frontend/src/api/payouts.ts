import api from './client'
import type { Payout, PayoutAccount } from '@/types'

export interface PayoutAccountPayload {
  type: 'iban' | 'mobile_money'
  account_holder_name: string
  iban?: string
  mobile_number?: string
  mobile_operator?: 'mtn' | 'orange'
  country_code: string
  is_default?: boolean
}

export const payoutsApi = {
  getAll: (params?: Record<string, string>) =>
    api.get<{ status: string; data: Payout[]; hasMore: boolean }>('/payouts', { params }),

  getById: (id: number) =>
    api.get<{ status: string; data: Payout }>(`/payouts/${id}`),
}

export const payoutAccountsApi = {
  getAll: () =>
    api.get<PayoutAccount[]>('/users/me/payout-accounts'),

  create: (data: PayoutAccountPayload) =>
    api.post<PayoutAccount>('/users/me/payout-accounts', data),

  update: (id: number, data: Partial<PayoutAccountPayload>) =>
    api.put<PayoutAccount>(`/users/me/payout-accounts/${id}`, data),

  remove: (id: number) =>
    api.delete(`/users/me/payout-accounts/${id}`),

  setDefault: (id: number) =>
    api.patch(`/users/me/payout-accounts/${id}/default`),
}
