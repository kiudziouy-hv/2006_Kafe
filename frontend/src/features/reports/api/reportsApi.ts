import { http } from '@/lib/http'

export interface RevenueSummary {
  from: string
  to: string
  revenue: number
  invoices: number
  itemsSold: number
  average: number
  cashRevenue: number
  transferRevenue: number
  refunded: number
  empty: boolean
  daily: { date: string; revenue: number; invoices: number }[]
  bestSellers: { name: string; quantity: number; revenue: number }[]
  byGroup: { group: string; quantity: number }[]
}

export const reportsApi = {
  summary: (from: string, to: string) =>
    http.get<RevenueSummary>('/reports/summary', { params: { from, to } }).then((r) => r.data),
}
