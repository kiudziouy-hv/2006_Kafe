import clsx from 'clsx'
import { LogOut, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { HOME_BY_ROLE, useAuth } from '@/features/auth'
import { notifications } from '@/lib/notifications'
import { ROLE_LABEL } from '@/utils/format'

/** Hai chữ cái đầu của họ tên cho ảnh đại diện. */
export function initials(name: string): string {
  const w = name.trim().split(/\s+/)
  return ((w[0]?.[0] ?? '') + (w.length > 1 ? (w[w.length - 1]?.[0] ?? '') : '')).toUpperCase()
}

/** Ảnh đại diện trên thanh tiêu đề, cạnh chuông thông báo: bấm để xem tên, vai trò, mở thông tin cá nhân hoặc đăng xuất. */
export function UserMenu({
  variant = 'avatar',
  collapsed = false,
}: {
  /** 'avatar': nút tròn trên thanh tiêu đề; 'card': khối tên và vai trò ở cuối thanh bên, menu mở lên trên. */
  variant?: 'avatar' | 'card'
  collapsed?: boolean
}) {
  const card = variant === 'card'
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={`Tài khoản: ${user.fullName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`${user.fullName} · ${ROLE_LABEL[user.role]}`}
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'border text-coffee-900 transition hover:border-brass',
          card
            ? clsx(
                'flex w-full items-center gap-3 rounded-2xl bg-white p-2.5 text-left',
                collapsed && 'justify-center',
              )
            : 'grid h-10 w-10 place-items-center rounded-full bg-coffee-100 text-sm font-bold',
          open ? 'border-brass' : 'border-line',
        )}
      >
        {card ? (
          <>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-coffee-100 text-sm font-bold">
              {initials(user.fullName)}
            </span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">
                  {user.staffName ?? user.fullName}
                </span>
                <span className="block truncate text-xs text-ink-soft">
                  {ROLE_LABEL[user.role]}
                </span>
              </span>
            )}
          </>
        ) : (
          initials(user.fullName)
        )}
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Tài khoản"
          className={clsx(
            'vt-card absolute z-40 !p-0',
            card
              ? 'bottom-full left-0 mb-2 w-full min-w-[216px]'
              : 'right-0 top-14 w-[min(92vw,280px)]',
          )}
        >
          <div className="flex items-center gap-3 border-b border-brass/40 px-4 py-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-coffee-100 text-sm font-bold text-coffee-900">
              {initials(user.fullName)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">
                {user.staffName ?? user.fullName}
              </span>
              <span className="block truncate text-xs text-ink-soft">{ROLE_LABEL[user.role]}</span>
            </span>
          </div>
          <div className="flex flex-col p-1.5">
            <Link
              role="menuitem"
              to={`${HOME_BY_ROLE[user.role]}/profile`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-coffee-100"
            >
              <UserRound size={17} aria-hidden />
              Thông tin cá nhân
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                notifications.reset()
                void logout()
              }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-danger transition hover:bg-danger-bg"
            >
              <LogOut size={17} aria-hidden />
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
