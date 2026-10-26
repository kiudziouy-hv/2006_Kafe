import { http } from '@/lib/http'

export interface Customer {
  id: number
  fullName: string
  phone: string
  points: number
}

export interface PointTx {
  id: number
  type: 'EARN' | 'REDEEM' | 'REFUND' | 'REVOKE'
  points: number
  shortfall: number
  createdAt: string
  invoiceNo: string | null
}

export interface CustomerDetail extends Customer {
  pointHistory: PointTx[]
  invoices: {
    id: number
    invoiceNo: string
    total: number
    status: 'PAID' | 'CANCELLED'
    issuedAt: string
    pointsUsed: number
    pointsEarned: number
  }[]
}

export const customersApi = {
  lookup: (phone: string) =>
    http.get<CustomerDetail>('/customers/lookup', { params: { phone } }).then((r) => r.data),
  register: (b: { fullName: string; phone: string }) =>
    http.post<Customer>('/customers', b).then((r) => r.data),
  list: (q: string) =>
    http.get<Customer[]>('/customers', { params: { q: q || undefined } }).then((r) => r.data),
}

export const POINT_LABEL: Record<PointTx['type'], string> = {
  EARN: 'Tích điểm',
  REDEEM: 'Dùng điểm',
  REFUND: 'Hoàn điểm',
  REVOKE: 'Thu hồi điểm',
}
