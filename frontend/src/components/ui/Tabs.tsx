import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'

export interface TabItem<T extends string> {
  id: T
  label: string
  icon?: LucideIcon
}

/** Thanh tab ngang, cuộn được trên điện thoại. */
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
    <div role="tablist" className="mb-4 flex gap-2 overflow-x-auto pb-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={clsx(
            'vt-tab flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 font-semibold',
            value !== t.id && 'bg-white/70 hover:bg-coffee-100',
          )}
        >
          {t.icon && <t.icon size={16} aria-hidden />}
          {t.label}
        </button>
      ))}
    </div>
  )
}
