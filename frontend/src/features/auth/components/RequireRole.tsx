import { Navigate, Outlet } from 'react-router-dom'
import type { Role } from '@/types/api'
import { HOME_BY_ROLE, useAuth } from '../hooks/useAuth'

/**
 * Chặn route theo vai trò. Đây chỉ là lớp điều hướng cho thân thiện; quyền thật do backend kiểm tra
 * ở từng API (NFR-011). Chủ quán/Quản lý kế thừa quyền ba vai trò còn lại.
 */
export function RequireRole({ roles }: { roles: Role[] }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="p-8 text-ink-soft">Đang kiểm tra phiên…</p>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'OWNER' && !roles.includes(user.role)) {
    return <Navigate to={HOME_BY_ROLE[user.role]} replace />
  }
  return <Outlet />
}
