import { http } from '@/lib/http'

export type InvoiceStatus = 'PAID' | 'CANCELLED'

export interface InvoiceSummary {
  id: number
  invoiceNo: string
  orderId: number
  orderType: 'DINE_IN' | 'TAKEAWAY'
  tableNo: number | null
  queueNumber: number | null
  paymentMethod: 'CASH' | 'TRANSFER_QR'
  subtotal: number
  promotionDiscount: number
  pointsUsed: number
  total: number
  pointsEarned: number
  status: InvoiceStatus
  issuedAt: string
  issuedBy: string
  sessionId: number
  sessionStatus: 'OPEN' | 'CLOSED'
  reprintCount: number
  customerId: number | null
  customerName: string | null
  customerPhone: string | null
  cancelReason: string | null
  cancelledAt: string | null
  cancelledBy: string | null
  refunded: number
  refundsPending: number
}

export interface InvoiceLine {
  id: number
  name: string
  size: string
  group: string
  quantity: number
  unitPrice: number
  toppingTotal: number
  discountPercent: number
  status: 'NEW' | 'MAKING' | 'DONE' | 'CANCELLED'
  cancelReason: string | null
  toppings: string[]
  canCancel: boolean
  temperature: 'HOT' | 'COLD' | null
  sugar: number | null
  ice: string | null
}

export interface Refund {
  id: number
  type: 'FULL' | 'PARTIAL'
  lineId: number | null
  cashAmount: number
  pointsRefunded: number
  reason: string
  createdAt: string
  createdBy: string
  confirmedAt: string | null
  confirmedBy: string | null
}

export interface InvoiceDetail extends InvoiceSummary {
  lines: InvoiceLine[]
  canCancel: boolean
  refunds: Refund[]
}

export interface InvoiceFilter {
  from: string
  to: string
  status: string
  q: string
}

export const invoicesApi = {
  list: (f: InvoiceFilter) =>
    http
      .get<InvoiceSummary[]>('/invoices', {
        params: { from: f.from, to: f.to, status: f.status || undefined, q: f.q || undefined },
      })
      .then((r) => r.data),
  detail: (id: number) => http.get<InvoiceDetail>(`/invoices/${id}`).then((r) => r.data),
  reprint: (id: number) => http.post<InvoiceDetail>(`/invoices/${id}/reprint`).then((r) => r.data),
  cancel: (id: number, reason: string) =>
    http.post<InvoiceDetail>(`/invoices/${id}/cancel`, { reason }).then((r) => r.data),
  cancelLine: (id: number, lineId: number, reason: string) =>
    http
      .post<InvoiceDetail>(`/invoices/${id}/lines/${lineId}/cancel`, { reason })
      .then((r) => r.data),
  confirmRefund: (refundId: number) =>
    http.post<InvoiceDetail>(`/invoices/refunds/${refundId}/confirm`).then((r) => r.data),
}
