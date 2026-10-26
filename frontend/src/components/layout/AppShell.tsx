import clsx from 'clsx'
import { PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react'
import { useCallback, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Wordmark } from '@/components/shared/Wordmark'
import { Logo } from '@/components/shared/Logo'
import { NotificationBell, type NotifExtra } from '@/components/layout/NotificationBell'
import { UserMenu } from '@/components/layout/UserMenu'
import { HOME_BY_ROLE, useAuth } from '@/features/auth'
import { useConnectionState } from '@/hooks/useTopic'
import { useIdleLogout } from '@/hooks/useIdleLogout'

export interface NavItem {
  to: string
  label: string
  end?: boolean
  icon?: LucideIcon
  /** Nhãn nhóm hiện phía trên mục đầu tiên của nhóm (thanh bên). */
  group?: string
}

/** Lời chào theo buổi trong ngày và ngày hôm nay, hiện bên trái thanh tiêu đề khi đã có thanh bên (tên người dùng nằm ở thanh bên). */
function Greeting({ name }: { name: string }) {
  const now = new Date()
  const h = now.getHours()
  const part = h < 11 ? 'buổi sáng' : h < 14 ? 'buổi trưa' : h < 18 ? 'buổi chiều' : 'buổi tối'
  const first = name.trim().split(/\s+/).pop() ?? name
  const date = now.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  return (
    <div className="hidden min-w-0 leading-tight md:block">
      <p className="truncate text-sm font-semibold text-coffee-900">
        Chào {part}, {first}
      </p>
      <p className="truncate text-xs capitalize text-ink-soft">{date}</p>
    </div>
  )
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

/** Khung chung của mọi vai trò: thanh tiêu đề (trạng thái kết nối, thông báo, ảnh đại diện kèm menu tài khoản) và vùng nội dung. */
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
            'sticky top-0 hidden h-screen shrink-0 self-start p-4 pr-0 transition-[width] duration-300 md:block',
            collapsed ? 'w-[100px]' : 'w-[272px]',
          )}
        >
          <div className="vt-sidebar flex h-full flex-col gap-1 overflow-y-auto overflow-x-hidden p-3">
            <div className={clsx('mb-2 flex items-center gap-2', collapsed ? 'flex-col' : 'px-1')}>
              <Logo className="h-10 w-10 shrink-0 !shadow-none ring-1 ring-brass/50" />
              {!collapsed && <Wordmark className="min-w-0 flex-1 text-lg text-coffee-900" />}
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
                aria-pressed={collapsed}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-white text-coffee-900 transition hover:border-brass"
              >
                {collapsed ? (
                  <PanelLeftOpen size={18} aria-hidden />
                ) : (
                  <PanelLeftClose size={18} aria-hidden />
                )}
              </button>
            </div>
            <div className="mb-1 border-b border-line" />
            {nav.map((n, i) => (
              <div key={n.to} className="contents">
                {n.group && n.group !== nav[i - 1]?.group && !collapsed && (
                  <p className="mt-3 px-3 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
                    {n.group}
                  </p>
                )}
                {n.group && n.group !== nav[i - 1]?.group && collapsed && i > 0 && (
                  <div className="my-2 border-t border-line" />
                )}
                <NavLink
                  to={n.to}
                  end={n.end}
                  className={clsx(
                    'vt-nav flex items-center gap-3 px-3 py-2 text-[15px] font-medium',
                    collapsed && 'justify-center',
                  )}
                  title={collapsed ? n.label : undefined}
                  aria-label={n.label}
                >
                  {n.icon && <n.icon size={19} aria-hidden className="shrink-0" />}
                  {!collapsed && <span className="truncate">{n.label}</span>}
                </NavLink>
              </div>
            ))}
            {user && (
              <div className="mt-auto">
                <UserMenu variant="card" collapsed={collapsed} />
              </div>
            )}
          </div>
        </aside>
      )}
      <div className="mx-auto flex min-w-0 w-full max-w-[1280px] flex-1 flex-col">
        <header className="vt-topbar m-3 flex items-center justify-between gap-3 px-5 py-2.5 md:mx-6 md:mt-6">
          <div className="flex min-w-0 items-center gap-3">
            {user && !sidebar && (
              <Link
                to={HOME_BY_ROLE[user.role]}
                title="Về trang chính"
                className="flex items-center gap-3"
              >
                <Logo className="h-9 w-9 shrink-0" />
                <Wordmark className="text-xl text-coffee-900 max-sm:hidden" />
              </Link>
            )}
            {user && sidebar && (
              <Link to={HOME_BY_ROLE[user.role]} title="Về trang chính" className="md:hidden">
                <Logo className="h-9 w-9 shrink-0" />
              </Link>
            )}
            {user && sidebar && <Greeting name={user.fullName} />}
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span
              className={clsx('h-2 w-2 rounded-full', dot[conn])}
              role="status"
              aria-label={dotLabel[conn]}
              title={dotLabel[conn]}
            />
            <NotificationBell extras={extras} />
            {/* Có thanh bên (md trở lên) thì avatar nằm ở cuối thanh bên; màn hẹp không có thanh bên nên giữ ở đây. */}
            <div className={sidebar ? 'md:hidden' : undefined}>
              <UserMenu />
            </div>
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
        <main className="flex-1 p-3 md:px-6 md:pb-6">{children ?? <Outlet />}</main>
      </div>
    </div>
  )
}
