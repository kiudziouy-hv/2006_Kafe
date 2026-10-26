import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/** Tiêu đề trang của Chủ quán: biểu tượng đồng thau nhỏ cạnh chữ. */
export function PageTitle({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <h1 className="mb-5 flex items-center gap-2.5 text-[1.65rem] font-semibold leading-tight">
      <Icon size={22} strokeWidth={1.8} className="text-brass-dark" aria-hidden />
      {children}
    </h1>
  )
}
