import { useEffect, useRef, useState, type ReactNode } from 'react'
import iconSearch from '../assets/icons/search.svg'
import iconMore from '../assets/icons/more.svg'
import iconClose from '../assets/icons/close.svg'

// Bảng, ô tìm kiếm, menu ⋯ của dòng — dùng cho các màn quản lý (Figma: Table, Search, Row menu)

export function Panel({ title, children, className = '', right }: { title?: string; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={`flex flex-col gap-3 rounded-xl border border-border-default bg-bg-surface p-4 ${className}`}>
      {(title || right) && (
        <div className="flex items-center gap-3">
          {title && <h2 className="flex-1 text-base font-semibold">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  )
}

export function SearchBox({ value, onChange, placeholder = 'Tìm kiếm…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex w-[280px] max-w-full items-center gap-2 rounded-full border border-border-default bg-bg-surface p-3">
      <img src={iconSearch} alt="" className="size-[18px]" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-secondary" />
      {value && (
        <button type="button" aria-label="Xóa tìm kiếm" onClick={() => onChange('')}>
          <img src={iconClose} alt="" className="size-4" />
        </button>
      )}
    </label>
  )
}

export type Col<T> = { head: string; cell: (row: T) => ReactNode; className?: string; flex?: number }

export function Table<T>({ cols, rows, rowKey, empty = 'Không có dữ liệu.', onRowClick, selectedKey }: { cols: Col<T>[]; rows: T[]; rowKey: (r: T) => string; empty?: string; onRowClick?: (r: T) => void; selectedKey?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border-default bg-bg-surface">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-bg-subtle text-xs text-text-secondary">
          <tr>
            {cols.map((c, i) => (
              <th key={i} className={`px-4 py-3 font-semibold ${c.className ?? ''}`}>
                {c.head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={rowKey(r)}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={`border-b border-border-default last:border-b-0 hover:bg-white/30 ${onRowClick ? 'cursor-pointer hover:bg-white/45' : ''} ${selectedKey === rowKey(r) ? 'bg-white/60' : ''}`}
            >
              {cols.map((c, i) => (
                <td key={i} className={`px-4 py-3 ${c.className ?? ''}`}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={cols.length} className="px-4 py-8 text-center text-text-secondary">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

type MenuAction = { label: string; onClick: () => void; danger?: boolean; disabled?: boolean }

// Menu hành động của dòng (popover ⋯) — S42c, S44c, S45c, S46c, S51c/e, S40b/c, S52c
export function RowMenu({ actions }: { actions: MenuAction[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label="Thao tác"
        onClick={() => setOpen(!open)}
        className="flex size-10 items-center justify-center rounded-md border border-glass-stroke bg-glass-fill-strong backdrop-blur-sm"
      >
        <img src={iconMore} alt="" className="size-5" />
      </button>
      {open && (
        <div className="absolute top-11 right-0 z-30 flex w-[250px] origin-top-right animate-pop-in flex-col rounded-xl border border-glass-stroke bg-[#f1eadf]/95 py-1 drop-shadow-[0_16px_20px_rgba(58,36,16,0.22)] backdrop-blur-lg">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              disabled={a.disabled}
              onClick={() => {
                setOpen(false)
                a.onClick()
              }}
              className={`px-4 py-2.5 text-left text-sm hover:bg-white/60 disabled:cursor-not-allowed disabled:text-text-disabled ${a.danger ? 'text-action-destructive' : ''}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
