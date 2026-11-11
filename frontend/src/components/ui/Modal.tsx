import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Hộp thoại giữa màn hình; Esc hoặc bấm nền để đóng. Nội dung cuộn khi dài (điện thoại). */
export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Portal ra body: thẻ cha có hiệu ứng transform sẽ làm lớp phủ fixed bị bó trong thẻ.
  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-coffee-950/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`vt-modal flex max-h-[92vh] w-full flex-col rounded-t-[var(--radius-card)] sm:rounded-[var(--radius-card)] ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
      >
        <header className="vt-modal-head flex items-center justify-between gap-3 rounded-t-[var(--radius-card)] px-5 py-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-brass-light/50"
          >
            <X size={18} aria-hidden />
          </button>
        </header>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
