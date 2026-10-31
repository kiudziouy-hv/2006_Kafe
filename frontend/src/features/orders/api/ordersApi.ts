import { http } from '@/lib/http'
import type { LineStatus } from '@/types/api'

export interface MenuSize {
  code: string
  label: string
  price: number
}

export interface MenuItem {
  id: number
  name: string
  group: string
  status: 'ACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED'
  hotOnly: boolean
  coldOnly: boolean
  cake: boolean
  takeaway: boolean
  sizes: MenuSize[]
  toppingIds: number[]
  imageUrl?: string | null
}

export interface MenuTopping {
  id: number
  name: string
  price: number
  status: 'ACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED'
  imageUrl?: string | null
}

export interface OpsMenu {
  items: MenuItem[]
  toppings: MenuTopping[]
  groups: string[]
}

export interface OrderLineDetail {
  id: number
  itemId: number
  name: string
  size: string
  temp: 'HOT' | 'COLD' | null
  sugar: string | null
  ice: string | null
  status: LineStatus
  toppings: string[]
  qty: number
  unitPrice: number
  discountPercent: number
  cancelReason: string | null
  cake: boolean
}

export interface OrderDetail {
  id: number
  type: 'DINE' | 'TAKEAWAY'
  tableNo: number | null
  seq: number | null
  status: 'OPEN' | 'DRAFT' | 'PAID' | 'CANCELLED'
  waitingPay: boolean
  total: number
  discount: number
  afterPromo: number
  rounded: number
  maxPoints: number
  pointsUsed: number
  pointsEarned: number
  customerName: string | null
  invoiceNo: string | null
  payMethod: string | null
  received?: number
  change?: number
  lines: OrderLineDetail[]
}

/** Dòng món gửi lên backend (POST /ops/tables/{no}/orders và /ops/takeaway). */
export interface NewLine {
  itemId: number
  size: string
  qty: number
  temp?: 'HOT' | 'COLD'
  sugar?: string
  ice?: string
  toppings: number[]
}

export const ordersApi = {
  menu: () => http.get<OpsMenu>('/ops/menu').then((r) => r.data),
  atTable: (no: number) =>
    http
      .get<OrderDetail>(`/ops/tables/${no}/order`)
      .then((r) => r.data)
      .catch((e) => {
        if (e?.response?.status === 404) return null
        throw e
      }),
  send: (no: number, lines: NewLine[]) =>
    http.post<OrderDetail>(`/ops/tables/${no}/orders`, { lines }).then((r) => r.data),
  cancelLine: (orderId: number, lineId: number, reason?: string) =>
    http
      .post<OrderDetail>(`/ops/orders/${orderId}/lines/${lineId}/cancel`, { reason })
      .then((r) => r.data),
  move: (orderId: number, to: number) =>
    http.post<OrderDetail>(`/ops/orders/${orderId}/move`, { to }).then((r) => r.data),
  finish: (orderId: number) =>
    http.post<OrderDetail>(`/ops/orders/${orderId}/finish`).then((r) => r.data),
  quote: (lines: NewLine[]) =>
    http
      .post<{ total: number; discount: number; afterPromo: number; maxPoints: number }>(
        '/ops/takeaway/quote',
        { lines },
      )
      .then((r) => r.data),
  takeaway: (b: {
    lines: NewLine[]
    method: 'CASH' | 'TRANSFER'
    received?: number
    customerId?: number
    points?: number
    staffId?: number
  }) => http.post<OrderDetail>('/ops/takeaway', b).then((r) => r.data),
}

export const SUGAR_LEVELS = ['0', '30', '50', '70', '100']
export const ICE_LEVELS: { value: string; label: string }[] = [
  { value: 'NONE', label: 'Không đá' },
  { value: 'LESS', label: 'Ít đá' },
  { value: 'NORMAL', label: 'Đá bình thường' },
  { value: 'SEPARATE', label: 'Đá riêng' }, // chỉ đơn mang đi: đá đựng riêng để đồ uống không loãng khi mang đi
]
export const ICE_LABEL: Record<string, string> = Object.fromEntries(
  ICE_LEVELS.map((i) => [i.value, i.label]),
)
