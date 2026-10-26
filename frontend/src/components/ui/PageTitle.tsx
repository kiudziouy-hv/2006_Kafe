import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/** Tiêu đề trang của Chủ quán: biểu tượng trong ô đồng thau + chữ. */
export function PageTitle({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <h1 className="mb-5 flex items-center gap-3 text-2xl font-bold">
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-coffee-900 to-coffee-700 text-brass-light shadow-md"
        aria-hidden
      >
        <Icon size={22} />
      </span>
      {children}
    </h1>
  )
}
