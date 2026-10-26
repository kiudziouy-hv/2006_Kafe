import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

/** Trạng thái trống: biểu tượng mờ và một dòng chữ. */
export function EmptyState({
  icon: Icon = Inbox,
  children,
}: {
  icon?: LucideIcon
  children: string
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-ink-soft">
      <Icon size={30} strokeWidth={1.5} aria-hidden />
      <p className="text-sm">{children}</p>
    </div>
  )
}
