import api from './client'

export type ReportTargetType = 'user' | 'travel'
export type ReportReason = 'false_info' | 'fraud' | 'inappropriate' | 'spam' | 'other'

export interface CreateReportPayload {
  target_type:  ReportTargetType
  target_id:    number
  reason:       ReportReason
  description?: string
}

export const reportsApi = {
  create: (data: CreateReportPayload) => api.post('/reports', data),
}
