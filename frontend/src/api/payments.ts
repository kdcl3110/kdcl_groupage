import api from './client'
import type { Payment } from '@/types'

export interface InitiatePaymentResult {
  paymentId:     number
  intentId:      string
  clientSecret?: string   // Stripe
  redirectUrl?:  string   // Notchpay
  amountDisplay: number
  currency:      string
  amountUsd:     number
  deadlineAt:    string
}

export const paymentsApi = {
  initiate: (packageId: number, currency: string) =>
    api.post<{ status: string; data: InitiatePaymentResult }>('/payments/initiate', { package_id: packageId, currency }),

  getForPackage: (packageId: number) =>
    api.get<{ status: string; data: Payment }>(`/payments/package/${packageId}`),

  getByReference: (reference: string) =>
    api.get<{ status: string; data: Payment & { package_id: number } }>(`/payments/reference/${reference}`),
}
