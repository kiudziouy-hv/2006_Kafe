import clsx from 'clsx'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Logo } from '@/components/shared/Logo'
import { Wordmark } from '@/components/shared/Wordmark'
import type { Role } from '@/types/api'

export type StaffRole = Exclude<Role, 'OWNER'>

export const ROLE_TILES: { role: StaffRole; label: string }[] = [
  { role: 'WAITER', label: 'Phục vụ' },
  { role: 'BARISTA', label: 'Pha chế' },
  { role: 'CASHIER', label: 'Thu ngân' },
]

/**
 * Thu nhỏ cả khung cho vừa chiều cao màn hình (không bao giờ phóng to), để form luôn thấy trọn vẹn khi thu hẹp cửa sổ
 * hoặc phóng to trình duyệt. Thu tối đa tới 55%; thấp hơn nữa thì cho cuộn.
 */
function useFitToViewport() {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const el = ref.current
    const host = el?.parentElement
    if (!el || !host) return
    const fit = () => {
      const pad = parseFloat(getComputedStyle(host).paddingTop) * 2
      const natural = el.offsetHeight // chiều cao bố cục, không bị ảnh hưởng bởi transform
      const next =
        natural > 0 ? Math.min(1, Math.max(0.55, (window.innerHeight - pad) / natural)) : 1
      setScale((cur) => (Math.abs(cur - next) < 0.005 ? cur : next))
    }
    fit()
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit)
    ro?.observe(el)
    window.addEventListener('resize', fit)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [])
  return { ref, scale }
}

/** Khung dùng chung của màn đăng nhập và màn chấm công: ảnh quán bên trái, logo và nội dung bên phải. */
export function AuthShell({
  children,
  compact,
}: {
  children: ReactNode
  /** Trang nhiều trường nhập (chấm công): chỉ ở điện thoại (< 640px) bỏ ảnh quán và thu nhỏ logo để không phải cuộn; từ máy tính bảng trở lên giống trang đăng nhập. */
  compact?: boolean
}) {
  const { ref, scale } = useFitToViewport()
  return (
    <main
      className={clsx(
        'grid h-dvh place-items-center overflow-y-auto bg-[#eadcc0] bg-[radial-gradient(ellipse_at_top,#f5e9cf,transparent_70%)] sm:p-8',
        compact ? 'p-2' : 'p-4',
      )}
    >
      <div
        ref={ref}
        style={{ transform: `scale(${scale})` }}
        className="grid w-full max-w-[1040px] overflow-hidden rounded-[36px] border-2 border-double border-brass bg-gradient-to-br from-[#fbf0d9] to-[#f0dcb4] shadow-[0_30px_70px_-20px_rgba(60,30,10,0.5)] lg:grid-cols-[0.85fr_1fr]"
      >
        <aside
          className={clsx(
            'relative h-52 overflow-hidden lg:h-auto lg:min-h-[640px]',
            compact && 'vt-aside-compact',
          )}
          aria-hidden
        >
          <img
            src="/login-bg.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[40%_center] sepia-[0.25]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-coffee-950/40 via-transparent to-coffee-950/20" />
          <div className="absolute inset-y-0 right-0 hidden w-40 bg-gradient-to-l from-[#f8ebd0] via-[#f8ebd0]/60 to-transparent lg:block" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#f8ebd0] via-[#f8ebd0]/70 to-transparent lg:hidden" />
        </aside>

        <section
          className={clsx(
            'relative flex flex-col items-center justify-center gap-4 px-6 sm:px-12 lg:py-10',
            compact ? 'pb-6 pt-5 sm:pb-9' : 'pb-9 pt-0',
          )}
        >
          <header
            className={clsx(
              'relative text-center lg:mt-0',
              compact ? 'vt-header-overlap' : '-mt-14',
            )}
          >
            <p className="hidden text-xs font-semibold uppercase tracking-widest text-ink-soft lg:block">
              Chào mừng bạn đến với
            </p>
            <Logo
              className={clsx(
                'mx-auto ring-2 ring-brass/50 lg:mt-4',
                compact ? 'h-16 w-16 sm:h-28 sm:w-28' : 'h-28 w-28',
              )}
            />
            <Wordmark className={clsx('mx-auto h-9', compact ? 'mt-2 sm:mt-3' : 'mt-3')} />
          </header>
          {children}
        </section>
      </div>
    </main>
  )
}

/** Ba ô chọn vai trò của nhân viên (Phục vụ, Pha chế, Thu ngân). */
export function RoleTiles({
  value,
  onChange,
}: {
  value: StaffRole | null
  onChange: (role: StaffRole) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Vai trò">
      {ROLE_TILES.map((t) => (
        <button
          key={t.role}
          type="button"
          role="radio"
          aria-checked={value === t.role}
          onClick={() => onChange(t.role)}
          className={clsx(
            'vt-hover-lift min-h-12 rounded-xl border text-xs font-semibold uppercase sm:min-h-14',
            value === t.role
              ? 'border-brass-dark bg-gradient-to-r from-coffee-900 to-coffee-700 text-ivory'
              : 'border-brass/50 bg-white/70 hover:border-brass hover:bg-coffee-100',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
