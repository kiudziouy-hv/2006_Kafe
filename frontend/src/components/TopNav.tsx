import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { AccountMenuPanel } from './AccountMenu'
import { NotificationBell } from './ui'
import iconChevron from '../assets/icons/chevron-sm.svg'

type Props = { title: string; user: string; role: string; right?: ReactNode }

// Top Navigation (Figma 28:309): tiêu đề trang, thông báo, người dùng — màn hình ngang.
export default function TopNav({ title, user, role, right }: Props) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <header className="sticky top-4 z-30 flex w-full items-center gap-4 rounded-2xl border border-glass-stroke bg-glass-fill px-6 py-3 drop-shadow-[0_8px_12px_rgba(58,36,16,0.18)] backdrop-blur-md">
      <h1 className="min-w-0 flex-1 text-xl leading-7 font-semibold">{title}</h1>
      {right}
      <NotificationBell />
      <div ref={ref} className="relative">
        <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-4">
          <span className="flex size-9 items-center justify-center rounded-full bg-bg-muted text-xs font-semibold">VP</span>
          <span className="hidden text-sm font-semibold sm:inline">{user}</span>
          <img src={iconChevron} alt="" className="size-4" />
        </button>
        {open && (
          <AccountMenuPanel
            name={user}
            role={role}
            initials="VP"
            className="absolute top-12 right-0 z-40 w-[240px]"
            onProfile={() => navigate('/ho-so')}
            onLogout={() => navigate('/dang-xuat')}
          />
        )}
      </div>
    </header>
  )
}

export function TabChips({ tabs }: { tabs: { to: string; label: string; end?: boolean }[] }) {
  return (
    <nav className="flex gap-2 overflow-x-auto">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            `shrink-0 rounded-full px-3 py-2 text-sm leading-5 font-semibold whitespace-nowrap ${
              isActive
                ? 'bg-action-primary text-action-on-primary'
                : 'border border-glass-stroke bg-glass-fill-strong opacity-85 drop-shadow-[0_2px_4px_rgba(58,36,16,0.1)]'
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
