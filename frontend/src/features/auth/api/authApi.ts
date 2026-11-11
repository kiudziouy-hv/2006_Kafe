import { http } from '@/lib/http'
import type { SessionUser, StaffAccount } from '@/types/api'

export const authApi = {
  me: () => http.get<SessionUser>('/auth/me').then((r) => r.data),
  staff: () => http.get<StaffAccount[]>('/auth/staff').then((r) => r.data),
  /** Nhân viên đang chấm công của vai trò, để chọn tên khi vào tài khoản quầy thu ngân/phục vụ. */
  onDuty: (role: 'CASHIER' | 'WAITER') =>
    http
      .get<{ id: number; name: string }[]>('/auth/on-duty', { params: { role } })
      .then((r) => r.data),
  staffLogin: (accountId: number, pin: string, staffId?: number) =>
    http.post<SessionUser>('/auth/staff/login', { accountId, pin, staffId }).then((r) => r.data),
  ownerLogin: (username: string, password: string) =>
    http.post<SessionUser>('/auth/owner/login', { username, password }).then((r) => r.data),
  logout: () => http.post('/auth/logout').then(() => undefined),
}
