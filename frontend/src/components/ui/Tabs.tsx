import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface TabItem<T extends string> {
  id: T
  label: string
  icon?: LucideIcon
}

/** Ô bên phải thanh tab dành cho nút hành động của tab đang mở (Thêm…, Tạo…). Mỗi trang chỉ có một thanh tab. */
let slot: HTMLElement | null = null
const listeners = new Set<() => void>()
function setSlot(el: HTMLElement | null) {
  if (slot === el) return
  slot = el
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/** Đặt nút hành động của tab vào cùng hàng với thanh tab, canh phải. */
export function TabAction({ children }: { children: ReactNode }) {
  const target = useSyncExternalStore(subscribe, () => slot)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted && target ? createPortal(children, target) : null
}

/** Bọc nội dung của tab đang mở: đổi tab thì nội dung mới trượt nhẹ vào thay vì đổi đột ngột. */
export function TabPanel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div key={id} className="vt-panel-in">
      {children}
    </div>
  )
}

/** Thanh tab ngang, cuộn được trên điện thoại; nút hành động của tab nằm cùng hàng ở bên phải. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: TabItem<T>[]
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div role="tablist" className="flex min-w-0 gap-2 overflow-x-auto py-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={value === t.id}
            onClick={() => onChange(t.id)}
            className={clsx(
              'vt-tab flex min-h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-semibold',
              value !== t.id && 'bg-white text-ink-soft hover:text-ink',
            )}
          >
            {t.icon && <t.icon size={16} aria-hidden />}
            {t.label}
          </button>
        ))}
      </div>
      <div ref={setSlot} className="flex shrink-0 items-center gap-2" />
    </div>
  )
}
