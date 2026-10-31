import { http } from '@/lib/http'

export type StaffRole = 'OWNER_MANAGER' | 'CASHIER' | 'WAITER' | 'BARISTA'
export type AccountStatus = 'ACTIVE' | 'TEMP_LOCKED' | 'LOCKED'

export interface StaffMember {
  id: number
  accountId: number
  fullName: string
  phone: string | null
  email: string | null
  username: string
  role: StaffRole
  status: AccountStatus
  /** Tài khoản quầy dùng chung, không chấm công. */
  station?: boolean
}

export interface StaffInput {
  fullName: string
  phone: string
  email: string
  role?: Exclude<StaffRole, 'OWNER_MANAGER'>
  secret?: string
}

export interface AttendanceRecord {
  id: number
  employeeId: number
  fullName: string
  shift: 'MORNING' | 'EVENING'
  checkIn: string
  checkOut: string | null
  edits: number
}

export interface AttendanceEdit {
  id: number
  editedBy: string
  editedAt: string
  oldValue: string
  newValue: string
}

export interface DaySession {
  id: number
  shift: 'MORNING' | 'EVENING'
  status: 'OPEN' | 'CLOSED'
  openingCash: number
  expectedCash: number | null
  actualCash: number | null
  difference: number | null
  openedAt: string
  closedAt: string | null
  openedBy: string
  closedBy: string | null
  invoices: number
  revenue: number
}

export interface DayState {
  date: string
  status: 'NONE' | 'OPEN' | 'CLOSED'
  sessions: DaySession[]
  openOrders: { id: number; label: string; status: string }[]
  busyTables: { number: number; status: string }[]
  eveningClosed: boolean
  canClose: boolean
}

export const staffApi = {
  me: () => http.get<StaffMember>('/staff/me').then((r) => r.data),
  updateMe: (b: Pick<StaffInput, 'fullName' | 'phone' | 'email'>) =>
    http.put<StaffMember>('/staff/me', b).then((r) => r.data),
  list: () => http.get<StaffMember[]>('/staff').then((r) => r.data),
  create: (b: StaffInput) => http.post<StaffMember>('/staff', b).then((r) => r.data),
  update: (id: number, b: StaffInput) =>
    http.put<StaffMember>(`/staff/${id}`, b).then((r) => r.data),
  setLocked: (id: number, locked: boolean) =>
    http.post<StaffMember>(`/staff/${id}/${locked ? 'lock' : 'unlock'}`).then((r) => r.data),
  resetSecret: (id: number, secret: string) =>
    http.post<StaffMember>(`/staff/${id}/secret`, { secret }).then((r) => r.data),
  attendance: (from: string, to: string, employeeId?: number) =>
    http
      .get<AttendanceRecord[]>('/attendance', { params: { from, to, employeeId } })
      .then((r) => r.data),
  attendanceHistory: (id: number) =>
    http.get<AttendanceEdit[]>(`/attendance/${id}/history`).then((r) => r.data),
  editAttendance: (id: number, b: { shift: string; checkIn: string; checkOut: string | null }) =>
    http.put<AttendanceRecord>(`/attendance/${id}`, b).then((r) => r.data),
  addAttendance: (b: {
    employeeId: number
    shift: string
    checkIn: string
    checkOut: string | null
  }) => http.post<AttendanceRecord>('/attendance', b).then((r) => r.data),
  checkIn: (accountId: number, pin: string, shift: string, role?: string) =>
    http
      .post<{ fullName: string }>('/auth/attendance/in', { accountId, pin, shift, role })
      .then((r) => r.data),
  checkOut: (accountId: number, pin: string, role?: string) =>
    http
      .post<{ fullName: string }>('/auth/attendance/out', { accountId, pin, role })
      .then((r) => r.data),
  day: () => http.get<DayState>('/shift/day').then((r) => r.data),
  closeDay: () => http.post<DayState>('/shift/day/close').then((r) => r.data),
}

export const ROLE_NAME: Record<StaffRole, string> = {
  OWNER_MANAGER: 'Chủ quán / Quản lý',
  CASHIER: 'Thu ngân',
  WAITER: 'Phục vụ',
  BARISTA: 'Pha chế',
}

export const ACCOUNT_STATUS: Record<AccountStatus, string> = {
  ACTIVE: 'Hoạt động',
  TEMP_LOCKED: 'Khóa tạm',
  LOCKED: 'Bị khóa',
}

/** Chuyển giá trị <input type="datetime-local"> (giờ máy) sang ISO UTC để gửi backend, và ngược lại. */
export function localToIso(local: string): string {
  return new Date(local).toISOString()
}

export function isoToLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
