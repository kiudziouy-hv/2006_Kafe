import clsx from 'clsx'
import { AlertTriangle, Bell, BellOff, CheckCheck, CircleCheck, Info, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { notifications, useNotifications, type NotifTone } from '@/lib/notifications'

export interface NotifExtra {
  id: string
  title: string
  description?: string
  to: string
}

const TONE_ICON = { success: CircleCheck, info: Info, warning: AlertTriangle } as const
const TONE_CLASS: Record<NotifTone, string> = {
  success: 'bg-success-bg text-success',
  info: 'bg-coffee-100 text-coffee-700',
  warning: 'bg-warning-bg text-warning',
}

function ago(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (Number.isNaN(s)) return ''
  if (s < 60) return 'vừa xong'
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`
  return `${Math.floor(s / 86400)} ngày trước`
}

/** Chuông thông báo trên thanh tiêu đề: sự kiện thời gian thực theo vai trò, kèm cảnh báo cố định (vd. kho) cho Chủ quán. */
export function NotificationBell({ extras = [] }: { extras?: NotifExtra[] }) {
  const list = useNotifications()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const unread = list.filter((n) => !n.read).length
  const badge = unread + extras.length

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

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={badge > 0 ? `Thông báo, ${badge} chưa đọc` : 'Thông báo'}
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o)
          if (open) notifications.markAllRead()
        }}
        className="vt-hover-lift relative grid h-11 w-11 place-items-center rounded-full border border-brass/60 bg-white/70 text-coffee-900 hover:bg-coffee-100"
      >
        <Bell
          size={20}
          aria-hidden
          className={clsx(badge > 0 && 'animate-[vt-ring_1.6s_ease-in-out_infinite]')}
        />
        {badge > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-bold leading-none text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Thông báo"
          className="vt-card absolute right-0 top-14 z-40 w-[min(92vw,380px)] !p-0"
        >
          <div className="flex items-center justify-between border-b border-brass/40 px-4 py-3">
            <h2 className="text-base font-bold">Thông báo</h2>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => notifications.markAllRead()}
                disabled={unread === 0}
                title="Đánh dấu đã đọc"
                aria-label="Đánh dấu tất cả đã đọc"
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-coffee-100 disabled:opacity-40"
              >
                <CheckCheck size={17} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => notifications.clear()}
                disabled={list.length === 0}
                title="Xóa tất cả"
                aria-label="Xóa tất cả thông báo"
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-coffee-100 disabled:opacity-40"
              >
                <Trash2 size={17} aria-hidden />
              </button>
            </div>
          </div>
          <ul className="max-h-[420px] overflow-y-auto">
            {extras.map((x) => (
              <li key={x.id} className="border-b border-line last:border-0">
                <Link
                  to={x.to}
                  onClick={() => setOpen(false)}
                  className="flex gap-3 px-4 py-3 hover:bg-coffee-100/60"
                >
                  <span
                    className={clsx(
                      'grid h-9 w-9 shrink-0 place-items-center rounded-full',
                      TONE_CLASS.warning,
                    )}
                  >
                    <AlertTriangle size={17} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{x.title}</span>
                    {x.description && (
                      <span className="block truncate text-xs text-ink-soft">{x.description}</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
            {list.map((n) => {
              const Icon = TONE_ICON[n.tone]
              return (
                <li
                  key={n.id}
                  className={clsx(
                    'flex gap-3 border-b border-line px-4 py-3 last:border-0',
                    !n.read && 'bg-brass/10',
                  )}
                >
                  <span
                    className={clsx(
                      'grid h-9 w-9 shrink-0 place-items-center rounded-full',
                      TONE_CLASS[n.tone],
                    )}
                  >
                    <Icon size={17} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{n.title}</span>
                    {n.description && (
                      <span className="block truncate text-xs text-ink-soft">{n.description}</span>
                    )}
                    <span className="block text-xs text-ink-soft">{ago(n.at)}</span>
                  </span>
                  {!n.read && (
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-danger" aria-hidden />
                  )}
                </li>
              )
            })}
            {list.length === 0 && extras.length === 0 && (
              <li className="flex flex-col items-center gap-2 px-4 py-10 text-ink-soft">
                <BellOff size={28} aria-hidden />
                <span className="text-sm">Chưa có thông báo nào</span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
