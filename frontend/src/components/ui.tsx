import { useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import iconArrowLeft from '../assets/icons/arrow-left.svg'
import iconInfo from '../assets/icons/info.svg'
import iconBell from '../assets/icons/bell.svg'
import iconCup from '../assets/icons/cup-placeholder.svg'
import iconCheck from '../assets/icons/check-white.svg'
import iconNotifSuccess from '../assets/icons/notif-success.svg'
import iconNotifError from '../assets/icons/notif-error.svg'
import iconCloseLg from '../assets/icons/close-lg.svg'
import iconAlertError from '../assets/icons/toast-error.svg'
import iconChevronDown from '../assets/icons/chevron-down.svg'
import iconCalendar from '../assets/icons/calendar.svg'
import { useStore } from '../store'

// Các thành phần dùng chung cho màn ứng dụng (Figma: trang 02 — Components)

export function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex min-h-screen animate-page-in flex-col gap-3 bg-bg-canvas p-3 ${className}`}>{children}</div>
}

type HeaderProps = { title: string; back?: boolean | string; right?: ReactNode; className?: string }

export function AppHeader({ title, back, right, className = '' }: HeaderProps) {
  const navigate = useNavigate()
  return (
    <header
      className={`sticky top-3 z-30 flex w-full items-center gap-3 rounded-2xl border border-glass-stroke bg-glass-fill px-4 py-2 shadow-glass backdrop-blur-md ${className}`}
    >
      {back && (
        <IconButton
          icon={iconArrowLeft}
          label="Quay lại"
          onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
        />
      )}
      <h1 className="min-w-0 flex-1 py-1 text-xl leading-7 font-semibold">{title}</h1>
      {right}
    </header>
  )
}

type IconButtonProps = { icon: string; label: string; onClick?: () => void; size?: 'sm' | 'md'; variant?: 'glass' | 'primary' | 'disabled'; dot?: boolean }

export function IconButton({ icon, label, onClick, size = 'md', variant = 'glass', dot }: IconButtonProps) {
  const box = size === 'sm' ? 'size-8' : 'size-10'
  const style =
    variant === 'primary'
      ? 'bg-action-primary'
      : variant === 'disabled'
        ? 'bg-bg-muted cursor-not-allowed'
        : 'border border-glass-stroke bg-glass-fill-strong backdrop-blur-sm hover:bg-white/80'
  return (
    <button
      type="button"
      aria-label={label}
      disabled={variant === 'disabled'}
      onClick={onClick}
      className={`relative flex shrink-0 items-center justify-center rounded-md transition active:scale-95 ${box} ${style}`}
    >
      <img src={icon} alt="" className={size === 'sm' ? 'size-4' : 'size-5'} />
      {dot && <span className="absolute -top-1 -right-1 size-2.5 animate-dot-pulse rounded-full bg-[#c2403b]" />}
    </button>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'destructive' | 'destructive-text'
  block?: boolean
}

export function Button({ variant = 'primary', block, className = '', disabled, ...props }: ButtonProps) {
  const styles = disabled
    ? 'border-transparent bg-bg-muted text-text-disabled cursor-not-allowed'
    : variant === 'primary'
      ? 'hover-lift border-glass-divider bg-gradient-to-r from-action-from to-action-primary text-action-on-primary hover:brightness-110'
      : variant === 'destructive'
        ? 'hover-lift border-transparent bg-action-destructive text-action-on-primary hover:brightness-110'
        : `border-glass-stroke bg-glass-fill-strong drop-shadow-[0_3px_5px_rgba(58,36,16,0.12)] backdrop-blur-sm hover:bg-white/75 ${
            variant === 'destructive-text' ? 'text-action-destructive' : 'text-text-primary'
          }`
  return (
    <button
      {...props}
      disabled={disabled}
      className={`flex min-h-[46px] items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm leading-5 font-semibold transition active:scale-[0.99] ${
        block ? 'w-full' : ''
      } ${styles} ${className}`}
    />
  )
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }

export function TextField({ label, error, hint, ...props }: FieldProps) {
  return (
    <label className="flex w-full flex-col gap-1">
      <span className="text-xs leading-4 font-semibold">{label}</span>
      <input
        {...props}
        className={`w-full rounded-md border bg-bg-surface p-3 text-sm leading-5 outline-none placeholder:text-text-secondary focus:border-action-primary disabled:bg-bg-muted disabled:text-text-disabled ${
          error ? 'border-action-destructive' : 'border-border-default'
        }`}
      />
      {error ? (
        <span className="text-xs leading-4 text-action-destructive">{error}</span>
      ) : (
        hint && <span className="text-xs leading-4 text-text-secondary">{hint}</span>
      )}
    </label>
  )
}

type DateFieldProps = { label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string; placeholder?: string }

const toDisplay = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '')

// Date Picker (Figma 25:191): hiển thị dd/mm/yyyy + icon lịch, bấm để mở lịch. Giá trị lưu dạng yyyy-mm-dd.
export function DateField({ label, value, onChange, error, hint, placeholder = 'dd/mm/yyyy' }: DateFieldProps) {
  const ref = useRef<HTMLInputElement>(null)
  const open = () => {
    const el = ref.current
    if (!el) return
    try {
      el.showPicker()
    } catch {
      el.focus()
    }
  }
  return (
    <label className="flex w-full flex-col gap-1">
      <span className="text-xs leading-4 font-semibold">{label}</span>
      <span
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open())}
        className={`relative flex w-full cursor-pointer items-center gap-2 rounded-md border bg-bg-surface p-3 text-sm leading-5 transition-colors focus-visible:border-action-primary focus-visible:outline-none ${
          error ? 'border-action-destructive' : 'border-border-default hover:border-border-strong'
        }`}
      >
        <span className={`flex-1 ${value ? '' : 'text-text-secondary'}`}>{value ? toDisplay(value) : placeholder}</span>
        <img src={iconCalendar} alt="" className="size-[18px]" />
        <input
          ref={ref}
          type="date"
          tabIndex={-1}
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pointer-events-none absolute inset-0 opacity-0"
        />
      </span>
      {error ? <span className="text-xs leading-4 text-action-destructive">{error}</span> : hint && <span className="text-xs leading-4 text-text-secondary">{hint}</span>}
    </label>
  )
}

export function Avatar({ initials, size = 'lg', onClick }: { initials: string; size?: 'sm' | 'lg'; onClick?: () => void }) {
  const cls = size === 'sm' ? 'size-7 text-[11px] font-normal' : 'size-12 text-sm font-semibold'
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={`flex shrink-0 items-center justify-center rounded-full bg-bg-muted ${cls}`}>
      {initials}
    </Tag>
  )
}

export function Chip({ label, selected, disabled, onClick }: { label: string; selected?: boolean; disabled?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-2 text-sm leading-5 font-semibold whitespace-nowrap transition ${
        selected
          ? 'bg-action-primary text-action-on-primary'
          : 'border border-glass-stroke bg-glass-fill-strong drop-shadow-[0_2px_4px_rgba(58,36,16,0.1)] backdrop-blur-sm hover:bg-white/80'
      } ${disabled ? 'cursor-not-allowed opacity-45' : ''}`}
    >
      {label}
    </button>
  )
}

type BadgeTone = 'neutral' | 'success' | 'warning' | 'error' | 'info'
const badgeTone: Record<BadgeTone, string> = {
  neutral: 'bg-bg-muted text-text-primary',
  success: 'bg-badge-success-bg text-badge-success-fg',
  warning: 'bg-warning-bg text-warning-fg',
  error: 'bg-error-bg text-error-fg',
  info: 'bg-info-bg text-info-fg',
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  return <span className={`inline-flex shrink-0 items-center rounded-sm px-2 py-0.5 text-xs leading-4 font-semibold whitespace-nowrap ${badgeTone[tone]}`}>{label}</span>
}

export function Thumb({ size = 'md', dim }: { size?: 'sm' | 'md'; dim?: boolean }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center border border-border-default bg-bg-muted ${
        size === 'sm' ? 'size-10 rounded-sm' : 'size-14 rounded-md'
      } ${dim ? 'opacity-60' : ''}`}
    >
      <img src={iconCup} alt="" className={size === 'sm' ? 'size-[18px]' : 'size-[25px]'} />
    </div>
  )
}

export function Checkbox({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`flex items-center gap-2 text-sm ${disabled ? 'cursor-not-allowed text-text-disabled' : 'cursor-pointer'}`}>
      <input type="checkbox" className="sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span
        className={`flex size-5 shrink-0 items-center justify-center rounded-sm transition-colors duration-150 ${
          disabled ? 'border border-border-default bg-bg-muted' : checked ? 'bg-action-primary' : 'border border-border-strong bg-bg-surface'
        }`}
      >
        {checked && <img src={iconCheck} alt="" className="size-3.5 animate-pop-in" />}
      </span>
      {label}
    </label>
  )
}

export function Alert({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex w-full items-start gap-3 rounded-xl border border-error-fg bg-error-bg px-4 py-3">
      <img src={iconAlertError} alt="" className="size-5 shrink-0" />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs">{message}</p>
      </div>
    </div>
  )
}

export function Scrim({ onClick }: { onClick?: () => void }) {
  return <div className="fixed inset-0 z-40 animate-fade-in bg-bg-inverse/50" onClick={onClick} />
}

type DialogProps = { title: string; message: ReactNode; children: ReactNode; className?: string }

// Confirmation Dialog (Figma 27:212)
export function ConfirmDialog({ title, message, children, className = '' }: DialogProps) {
  return (
    <div
      role="dialog"
      aria-labelledby="dialog-title"
      className={`flex w-full flex-col items-center gap-3 rounded-2xl border border-glass-stroke bg-glass-fill-strong p-6 drop-shadow-[0_16px_20px_rgba(58,36,16,0.28)] backdrop-blur-lg ${className}`}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-info-bg">
        <img src={iconInfo} alt="" className="size-7" />
      </div>
      <h2 id="dialog-title" className="text-center text-base font-semibold">{title}</h2>
      <div className="text-center text-sm text-text-secondary">{message}</div>
      <div className="flex w-full gap-2 [&>*]:flex-1">{children}</div>
    </div>
  )
}

// Hộp thoại nổi giữa màn hình, có scrim phía sau.
export function DialogOverlay({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <>
      <Scrim onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="w-full max-w-[460px] animate-pop-in" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>
    </>
  )
}

// Modal có tiêu đề + nút đóng (popup form trong Figma)
export function Modal({ title, onClose, children, width = 'max-w-[480px]' }: { title: string; onClose: () => void; children: ReactNode; width?: string }) {
  return (
    <>
      <Scrim onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div
          role="dialog"
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
          className={`flex max-h-[92vh] w-full animate-pop-in flex-col gap-4 overflow-y-auto rounded-[28px] border border-glass-stroke bg-[#f5eee2] p-6 shadow-[0_20px_48px_-8px_rgba(47,24,5,0.28)] ${width}`}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl leading-7 font-semibold">{title}</h2>
            <button type="button" aria-label="Đóng" onClick={onClose}>
              <img src={iconCloseLg} alt="" className="size-[22px]" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  )
}

type SelectProps = { label: string; value: string; onChange: (v: string) => void; options: (string | { value: string; label: string })[]; hint?: string; placeholder?: string; disabled?: boolean }

export function Select({ label, value, onChange, options, hint, placeholder, disabled }: SelectProps) {
  return (
    <label className="flex w-full flex-col gap-1">
      <span className="text-xs leading-4 font-semibold">{label}</span>
      <span className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-md border border-border-default bg-bg-surface p-3 pr-10 text-sm leading-5 outline-none focus:border-action-primary disabled:bg-bg-muted disabled:text-text-disabled"
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => {
            const opt = typeof o === 'string' ? { value: o, label: o } : o
            return (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            )
          })}
        </select>
        <img src={iconChevronDown} alt="" className="pointer-events-none absolute top-1/2 right-3 h-[7px] w-3.5 -translate-y-1/2" />
      </span>
      {hint && <span className="text-xs leading-4 text-text-secondary">{hint}</span>}
    </label>
  )
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex w-full flex-col items-center gap-2 rounded-xl border border-border-default bg-bg-surface px-6 py-8 text-center">
      <p className="text-base font-semibold">{title}</p>
      <p className="text-xs text-text-secondary">{message}</p>
    </div>
  )
}

// Chuông thông báo + popover (S10c / S22c)
export function NotificationBell() {
  const { notices, markNoticesRead } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const unread = notices.filter((n) => !n.read)
  const read = notices.filter((n) => n.read)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const toggle = () => {
    if (open) markNoticesRead()
    setOpen(!open)
  }

  return (
    <div ref={ref} className="relative">
      <IconButton icon={iconBell} label="Thông báo" size="sm" onClick={toggle} dot={unread.length > 0} />
      {open && (
        <div className="absolute top-12 -right-4 z-40 flex w-[min(366px,calc(100vw-24px))] origin-top-right animate-pop-in flex-col gap-2 rounded-[20px] border border-glass-stroke bg-bg-canvas p-3.5 shadow-[0_16px_40px_-6px_rgba(47,24,5,0.28)]">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold">Thông báo</p>
            <button type="button" aria-label="Đóng" onClick={toggle}>
              <img src={iconCloseLg} alt="" className="size-[22px]" />
            </button>
          </div>
          {unread.length > 0 && <p className="text-[13px] font-semibold text-bg-inverse/60">Mới ({unread.length})</p>}
          {unread.map((n) => (
            <NoticeItem key={n.id} {...n} />
          ))}
          {read.length > 0 && <p className="text-[13px] font-semibold text-bg-inverse/60">Trước đó</p>}
          {read.map((n) => (
            <NoticeItem key={n.id} {...n} />
          ))}
        </div>
      )}
    </div>
  )
}

function NoticeItem({ type, title, body, time, read }: { type: 'success' | 'error'; title: string; body: string; time: string; read: boolean }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border border-border-default px-4 py-3 ${read ? 'bg-bg-surface' : 'bg-bg-subtle'}`}>
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${type === 'error' ? 'bg-error-bg' : 'bg-badge-success-bg'}`}>
        <img src={type === 'error' ? iconNotifError : iconNotifSuccess} alt="" className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-text-secondary">{body}</p>
        <p className="text-[11px] text-text-secondary">{time}</p>
      </div>
      {!read && <span className="mt-1 size-2 shrink-0 rounded-full bg-action-primary" />}
    </div>
  )
}
