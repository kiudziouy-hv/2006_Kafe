import type { ReactNode } from 'react'
import { Badge } from './ui'
import type { LineStatus, OrderLine } from '../store'

export const lineBadge: Record<LineStatus, { label: string; tone: 'neutral' | 'warning' | 'success' | 'error' }> = {
  new: { label: 'Mới', tone: 'neutral' },
  brewing: { label: 'Đang pha', tone: 'warning' },
  done: { label: 'Hoàn thành', tone: 'success' },
  cancelled: { label: 'Đã hủy', tone: 'error' },
}

type Props = { line: OrderLine; selected?: boolean; onClick?: () => void; children?: ReactNode; meta?: string }

// Order Line Card (Figma 28:364): Mới → Đang pha → Hoàn thành; hoặc Đã hủy.
export default function OrderLineCard({ line, selected, onClick, children, meta }: Props) {
  const b = lineBadge[line.status]
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex w-full flex-col gap-2 rounded-xl bg-bg-surface p-4 text-left ${
        selected ? 'border-2 border-action-primary' : 'border border-border-default'
      } ${line.status === 'cancelled' ? 'opacity-60' : ''}`}
    >
      <div className="flex w-full items-center gap-2">
        <p className="min-w-0 flex-1 text-sm font-semibold">
          {line.qty}× {line.name}
        </p>
        <Badge label={b.label} tone={b.tone} />
      </div>
      <p className="text-xs text-text-secondary">{meta ?? [line.options, `gửi ${line.sentAt}`].filter(Boolean).join(' · ')}</p>
      {children}
    </Tag>
  )
}
