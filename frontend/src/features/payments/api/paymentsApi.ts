import { http } from '@/lib/http'
import type { OrderDetail } from '@/features/orders/api/ordersApi'

export interface ShiftInfo {
  id: number
  type: 'MORNING' | 'EVENING'
  openingCash: number
  openedAt?: string
  openedBy?: string
  transferSales?: number
  transferCount?: number
}

/** Một ca trong ngày kinh doanh, kèm doanh thu của ca (tiền mặt và chuyển khoản/QR). */
export type DayShift = ShiftInfo & {
  open: boolean
  businessDate: string
  cashSales: number
  invoiceCount: number
  expectedCash: number | null
  actualCash: number | null
  diff: number | null
  closedAt: string | null
}

export interface ShiftDay {
  date: string
  shifts: DayShift[]
  cashTotal: number
  transferTotal: number
  invoiceCount: number
}

export interface ShiftState {
  open: boolean
  shift: ShiftInfo | null
  /** 7 ngày gần nhất, hôm nay đứng đầu (luôn có, dù chưa mở ca nào). */
  days?: ShiftDay[]
  cashSales?: number
  expected?: number
  drafts?: number
  undelivered?: number
}

export type PayMethod = 'CASH' | 'TRANSFER'

export interface Payer {
  customerId?: number
  points?: number
}

/** Đơn kèm số liệu tính tiền (khuyến mãi, điểm) trả về từ các API thanh toán. */
export type PayOrder = OrderDetail

export const paymentsApi = {
  shift: () => http.get<ShiftState>('/ops/shift').then((r) => r.data),
  openShift: (type: 'MORNING' | 'EVENING', openingCash: number) =>
    http.post('/ops/shift/open', { type, openingCash }).then((r) => r.data),
  closeShift: (actualCash: number) =>
    http.post('/ops/shift/close', { actualCash }).then((r) => r.data),
  pending: () => http.get<PayOrder[]>('/ops/pending').then((r) => r.data),
  pay: (orderId: number, method: PayMethod, received: number | undefined, payer: Payer) =>
    http
      .post<PayOrder>(`/ops/orders/${orderId}/pay`, { method, received, ...payer })
      .then((r) => r.data),
  drafts: () => http.get<PayOrder[]>('/ops/drafts').then((r) => r.data),
  confirmDraft: (id: number, payer: Payer) =>
    http.post<PayOrder>(`/ops/drafts/${id}/confirm`, payer).then((r) => r.data),
  handovers: () => http.get<PayOrder[]>('/ops/takeaway/handovers').then((r) => r.data),
  handover: (id: number) => http.post<PayOrder>(`/ops/orders/${id}/handover`).then((r) => r.data),
  cancelDraft: (id: number) => http.post<PayOrder>(`/ops/drafts/${id}/cancel`).then((r) => r.data),
}
