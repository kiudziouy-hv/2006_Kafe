import type { ReactNode } from 'react'

export interface Column<T> {
  header: string
  cell: (row: T) => ReactNode
  className?: string
}

/** Bảng đơn giản, cuộn ngang trên màn hình nhỏ. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty = 'Chưa có dữ liệu.',
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  empty?: string
}) {
  if (rows.length === 0) return <p className="py-6 text-center text-ink-soft">{empty}</p>
  return (
    <div className="overflow-x-auto rounded-2xl border border-brass/60 bg-white/60 shadow-[var(--shadow-card)]">
      <table className="vt-table w-full min-w-max text-left text-sm">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} className={`px-4 py-3 font-semibold ${c.className ?? ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} className="border-t border-line">
              {columns.map((c, i) => (
                <td key={i} className={`px-4 py-3 align-middle ${c.className ?? ''}`}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
