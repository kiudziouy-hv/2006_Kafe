/** Kiểu dữ liệu khớp phản hồi của backend (vn.vtph.coffee.auth và vn.vtph.coffee.ops). */
export type Role = 'OWNER' | 'WAITER' | 'CASHIER' | 'BARISTA'

export interface SessionUser {
  id: number
  fullName: string
  role: Role
  /** Mã màn hình trang chủ theo vai trò (S54, S10, S20, S30) */
  home: string
  /** 0 = không tự đăng xuất; 300 = 5 phút không thao tác (UC-02) */
  autoLogoutSeconds: number
}

export interface StaffAccount {
  id: number
  fullName: string
  role: Exclude<Role, 'OWNER'>
  locked: boolean
  /** Tài khoản quầy dùng chung (thu ngân, pha chế): đăng nhập thao tác, không chấm công. */
  station?: boolean
}

export interface ApiError {
  code: string
  message: string
  attemptsLeft?: number
  lockSeconds?: number
  fields?: Record<string, string>
}

export type TableStatus = 'EMPTY' | 'SERVING' | 'WAITING_PAY'

export interface DiningTable {
  no: number
  zone: string
  status: TableStatus
  orderId: number | null
}

export type LineStatus = 'NEW' | 'MAKING' | 'DONE' | 'CANCELLED'

export interface KitchenLine {
  id: number
  orderId: number
  label: string
  name: string
  qty: number
  size: string
  temp: string | null
  sugar: string | null
  ice: string | null
  toppings: string[]
  cake: boolean
  status: LineStatus
  sentAt: string
  canStart: boolean
}

export interface OrderLine {
  id: number
  name: string
  qty: number
  status: LineStatus
}

export interface Order {
  id: number
  type: 'DINE' | 'TAKEAWAY'
  tableNo: number | null
  seq: number | null
  status: 'OPEN' | 'DRAFT' | 'PAID' | 'CANCELLED'
  waitingPay: boolean
  rounded: number
  total: number
  invoiceNo?: string | null
  lines: OrderLine[]
}

/** Sự kiện thời gian thực do NotificationBridge phát (chỉ báo "có thay đổi", dữ liệu lấy lại qua REST). */
export interface OpsMessage {
  type:
    | 'ORDER_SENT'
    | 'LINE_MAKING'
    | 'LINE_DONE'
    | 'LINE_CANCELLED'
    | 'TABLE_WAITING_PAY'
    | 'ORDER_PAID'
    | 'LINE_SHORTAGE'
    | 'SHIFT_OPENED'
    | 'SHIFT_CLOSED'
  /** Sự kiện của đơn/dòng món; sự kiện ca (SHIFT_*) mang `shiftId` thay vì `orderId`. */
  orderId?: number
  shiftId?: number
  label: string
  name?: string
  /** LINE_DONE của đơn mang đi: Thu ngân gọi khách nhận, không cần mang ra bàn. */
  takeaway?: boolean
  at: string
}
