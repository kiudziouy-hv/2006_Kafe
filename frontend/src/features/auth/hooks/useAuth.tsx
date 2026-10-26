import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { onUnauthorized } from '@/lib/http'
import { realtime } from '@/lib/websocket'
import type { Role, SessionUser } from '@/types/api'
import { authApi } from '../api/authApi'

interface AuthContextValue {
  user: SessionUser | null
  loading: boolean
  loginStaff: (accountId: number, pin: string) => Promise<SessionUser>
  loginOwner: (username: string, password: string) => Promise<SessionUser>
  logout: (reason?: 'expired' | 'manual') => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const ME_KEY = ['auth', 'me'] as const

/** Trang chủ theo vai trò (UI_GD4 mục 8.6): Chủ quán S54, Phục vụ S10, Thu ngân S20, Pha chế S30. */
export const HOME_BY_ROLE: Record<Role, string> = {
  OWNER: '/admin',
  WAITER: '/service',
  CASHIER: '/cashier',
  BARISTA: '/kitchen',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const navigate = useNavigate()

  const me = useQuery({
    queryKey: ME_KEY,
    queryFn: () => authApi.me().catch(() => null),
    staleTime: Infinity,
    retry: false,
  })

  const staffMutation = useMutation({
    mutationFn: (v: { accountId: number; pin: string }) => authApi.staffLogin(v.accountId, v.pin),
  })
  const ownerMutation = useMutation({
    mutationFn: (v: { username: string; password: string }) =>
      authApi.ownerLogin(v.username, v.password),
  })

  const clear = useCallback(
    (reason: 'expired' | 'manual') => {
      realtime.disconnect()
      qc.setQueryData(ME_KEY, null)
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'auth' })
      navigate(reason === 'expired' ? '/login?expired=1' : '/login', { replace: true })
    },
    [navigate, qc],
  )

  // Hết phiên ở bất kỳ API nào -> về trang đăng nhập kèm thông báo
  useEffect(() => onUnauthorized(() => clear('expired')), [clear])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: me.data ?? null,
      loading: me.isPending,
      loginStaff: async (accountId, pin) => {
        const u = await staffMutation.mutateAsync({ accountId, pin })
        qc.setQueryData(ME_KEY, u)
        return u
      },
      loginOwner: async (username, password) => {
        const u = await ownerMutation.mutateAsync({ username, password })
        qc.setQueryData(ME_KEY, u)
        return u
      },
      logout: async (reason = 'manual') => {
        await authApi.logout().catch(() => undefined)
        clear(reason)
      },
    }),
    [me.data, me.isPending, staffMutation, ownerMutation, qc, clear],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth phải nằm trong AuthProvider')
  return ctx
}
