import clsx from 'clsx'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type Tone = 'success' | 'danger' | 'info' | 'warning'
interface Toast {
  id: number
  tone: Tone
  title: string
  description?: string
}

const ToastContext = createContext<{ notify: (t: Omit<Toast, 'id'>) => void } | null>(null)
let seq = 0

const tones: Record<Tone, string> = {
  success: 'border-success/40 bg-success-bg text-success',
  danger: 'border-danger/40 bg-danger-bg text-danger',
  warning: 'border-warning/40 bg-warning-bg text-warning',
  info: 'border-line bg-white text-ink',
}

/** Toast góc trên phải, tối đa 3 thông báo xếp chồng (quy chuẩn trong Figma trang Toast). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])

  const notify = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++seq
    setItems((cur) => [...cur.slice(-2), { ...t, id }])
    window.setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== id)), 4000)
  }, [])

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={clsx(
              'pointer-events-auto rounded-2xl border px-4 py-3 shadow-lg',
              tones[t.tone],
            )}
          >
            <p className="font-semibold">{t.title}</p>
            {t.description && <p className="text-sm opacity-90">{t.description}</p>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast phải nằm trong ToastProvider')
  return ctx
}
