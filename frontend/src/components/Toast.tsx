import { useEffect } from 'react'
import iconError from '../assets/icons/toast-error.svg'
import iconInfo from '../assets/icons/toast-info.svg'
import iconWarning from '../assets/icons/toast-warning.svg'
import iconClose from '../assets/icons/close-error.svg'

export type ToastData = { type: 'error' | 'success' | 'info' | 'warning'; title: string; message?: string }

type Props = { toast: ToastData | null; onClose: () => void }

const tone = {
  error: 'border-error-fg bg-error-bg',
  success: 'border-success-fg bg-success-bg',
  info: 'border-info-fg bg-info-bg',
  warning: 'border-warning-fg bg-warning-bg text-warning-title',
}

// Toast nổi ở đầu màn hình, tự đóng sau 4 giây (Figma: Toast 26:144).
export default function Toast({ toast, onClose }: Props) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [toast, onClose])

  if (!toast) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-4 lg:justify-end lg:px-6">
      <div
        role="status"
        className={`pointer-events-auto flex w-full animate-toast-in max-w-[360px] items-start gap-3 rounded-xl border px-4 py-3 text-text-primary drop-shadow-[0_8px_12px_rgba(58,36,16,0.18)] ${tone[toast.type]}`}
      >
        {toast.type === 'success' ? (
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-success-fg text-[11px] font-bold text-success-fg">✓</span>
        ) : (
          <img src={toast.type === 'error' ? iconError : toast.type === 'warning' ? iconWarning : iconInfo} alt="" className="size-5 shrink-0" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-sm leading-5 font-semibold">{toast.title}</p>
          {toast.message && <p className="text-xs leading-4">{toast.message}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Đóng" className="shrink-0">
          <img src={iconClose} alt="" className="size-4" />
        </button>
      </div>
    </div>
  )
}
