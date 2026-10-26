import { http } from '@/lib/http'
import type { SessionUser, StaffAccount } from '@/types/api'

export const authApi = {
  me: () => http.get<SessionUser>('/auth/me').then((r) => r.data),
  staff: () => http.get<StaffAccount[]>('/auth/staff').then((r) => r.data),
  staffLogin: (accountId: number, pin: string) =>
    http.post<SessionUser>('/auth/staff/login', { accountId, pin }).then((r) => r.data),
  ownerLogin: (username: string, password: string) =>
    http.post<SessionUser>('/auth/owner/login', { username, password }).then((r) => r.data),
  logout: () => http.post('/auth/logout').then(() => undefined),
}
