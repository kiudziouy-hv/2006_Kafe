import clsx from 'clsx'
import { LogOut, PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react'
import { useCallback, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Wordmark } from '@/components/shared/Wordmark'
import { Logo } from '@/components/shared/Logo'
import { Button } from '@/components/ui/Button'
import { NotificationBell, type NotifExtra } from '@/components/layout/NotificationBell'
import { notifications } from '@/lib/notifications'
import { HOME_BY_ROLE, useAuth } from '@/features/auth'
import { useConnectionState } from '@/hooks/useTopic'
import { useIdleLogout } from '@/hooks/useIdleLogout'
import { ROLE_LABEL } from '@/utils/format'

export interface NavItem {
  to: string
  label: string
  end?: boolean
  icon?: LucideIcon
}

const dot = {
  connected: 'bg-success',
  connecting: 'bg-warning',
  disconnected: 'bg-danger',
} as const
const dotLabel = {
  connected: 'Đang trực tuyến',
  connecting: 'Đang kết nối…',
  disconnected: 'Mất kết nối',
} as const

/** Khung chung của mọi vai trò: thanh tiêu đề (tên, vai trò, trạng thái kết nối, đăng xuất) và vùng nội dung. */
export function AppShell({
  nav = [],
  sidebar = false,
  extras,
  children,
}: {
  nav?: NavItem[]
  sidebar?: boolean
  /** Cảnh báo cố định hiện đầu danh sách thông báo (vd. cảnh báo kho của Chủ quán). */
  extras?: NotifExtra[]
  children?: ReactNode
}) {
  const { user, logout } = useAuth()
  const conn = useConnectionState()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('vt-sidebar') === 'collapsed'
    } catch {
      return false
    }
  })
  const toggleSidebar = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem('vt-sidebar', c ? 'open' : 'collapsed')
      } catch {
        /* không lưu được thì bỏ qua */
      }
      return !c
    })
  const onIdle = useCallback(() => void logout('expired'), [logout])
  useIdleLogout(user?.autoLogoutSeconds ?? 0, onIdle)

  return (
    <div className={clsx('flex min-h-full', sidebar ? 'flex-row' : 'flex-col')}>
      {sidebar && (
        <aside
          className={clsx(
            'vt-sidebar sticky top-0 hidden h-screen shrink-0 flex-col gap-1.5 self-start overflow-y-auto overflow-x-hidden p-4 transition-[width] duration-300 md:flex',
            collapsed ? 'w-[84px]' : 'w-60',
          )}
        >
          <Logo
            className={clsx(
              'mx-auto mt-1 ring-2 ring-brass/60 transition-all duration-300',
              collapsed ? 'h-11 w-11' : 'h-28 w-28',
            )}
          />
          <div className="mb-4 border-b border-brass/40 pb-4" />
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                clsx(
                  'vt-nav flex items-center gap-3 px-3 py-2.5 font-semibold',
                  collapsed && 'justify-center',
                  isActive && 'shadow-md',
                )
              }
              title={collapsed ? n.label : undefined}
              aria-label={n.label}
            >
              {n.icon && <n.icon size={19} aria-hidden className="shrink-0" />}
              {!collapsed && <span className="truncate">{n.label}</span>}
            </NavLink>
          ))}
        </aside>
      )}
      <div
        className={clsx('flex min-w-0 flex-1 flex-col', sidebar && 'mx-auto w-full max-w-[1240px]')}
      >
        <header className="vt-topbar m-3 md:mx-6 md:mt-6 flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            {sidebar && (
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
                aria-pressed={collapsed}
                className="vt-hover-lift hidden h-11 w-11 place-items-center rounded-full border border-brass/60 bg-white/70 text-coffee-900 hover:bg-coffee-100 md:grid"
              >
                {collapsed ? (
                  <PanelLeftOpen size={20} aria-hidden />
                ) : (
                  <PanelLeftClose size={20} aria-hidden />
                )}
              </button>
            )}
            {!sidebar && (
              <>
                <Logo className="h-9 w-9" />
                <Wordmark className="text-xl text-coffee-900" />
              </>
            )}
            {user && (
              <Link
                to={`${HOME_BY_ROLE[user.role]}/profile`}
                className="text-sm text-ink-soft underline-offset-2 hover:underline"
                title="Cập nhật thông tin cá nhân"
              >
                {user.fullName} · {ROLE_LABEL[user.role]}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span
              className="flex items-center gap-2 text-xs text-ink-soft"
              role="status"
              aria-label={dotLabel[conn]}
            >
              <span className={clsx('h-2.5 w-2.5 rounded-full', dot[conn])} aria-hidden />
              <span className="hidden sm:inline">{dotLabel[conn]}</span>
            </span>
            <NotificationBell extras={extras} />
            <Button
              variant="secondary"
              onClick={() => {
                notifications.clear()
                void logout()
              }}
              aria-label="Đăng xuất"
            >
              <LogOut size={18} aria-hidden /> <span className="hidden sm:inline">Đăng xuất</span>
            </Button>
          </div>
        </header>
        {sidebar && nav.length > 0 && (
          <nav className="mx-3 flex gap-2 overflow-x-auto md:hidden" aria-label="Mục chính">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  clsx(
                    'vt-tab flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold',
                    isActive
                      ? 'bg-gradient-to-r from-coffee-900 to-coffee-700 text-ivory'
                      : 'bg-white/70',
                  )
                }
              >
                {n.icon && <n.icon size={16} aria-hidden />}
                {n.label}
              </NavLink>
            ))}
          </nav>
        )}
        <main className={clsx('flex-1', sidebar ? 'p-3 md:p-6' : 'p-3')}>
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  )
}
