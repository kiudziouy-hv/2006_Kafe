import clsx from 'clsx'
import { LayoutGrid, List } from 'lucide-react'
import { useState } from 'react'

export type MenuView = 'gallery' | 'list'
const KEY = 'vt-menu-view'

/** Kiểu xem (ảnh / danh sách) dùng chung cho Món và Topping, nhớ lựa chọn của người dùng. */
export function useMenuView(): [MenuView, (v: MenuView) => void] {
  const [view, setView] = useState<MenuView>(() => {
    try {
      return localStorage.getItem(KEY) === 'list' ? 'list' : 'gallery'
    } catch {
      return 'gallery'
    }
  })
  const choose = (v: MenuView) => {
    setView(v)
    try {
      localStorage.setItem(KEY, v)
    } catch {
      /* không lưu được thì bỏ qua */
    }
  }
  return [view, choose]
}

export function ViewToggle({
  value,
  onChange,
}: {
  value: MenuView
  onChange: (v: MenuView) => void
}) {
  return (
    <div
      role="group"
      aria-label="Kiểu hiển thị"
      className="inline-flex rounded-full border border-line bg-white p-1"
    >
      {(
        [
          ['gallery', 'Ảnh', LayoutGrid],
          ['list', 'Danh sách', List],
        ] as const
      ).map(([v, label, Icon]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={clsx(
            'flex min-h-8 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition',
            value === v
              ? 'bg-gradient-to-r from-[#825423] to-[#693714] text-ivory'
              : 'text-ink-soft hover:text-ink',
          )}
        >
          <Icon size={15} aria-hidden />
          {label}
        </button>
      ))}
    </div>
  )
}
