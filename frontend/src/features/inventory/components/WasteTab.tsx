import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { QueryState } from '@/components/feedback/QueryState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { useAction } from '@/hooks/useAction'
import { formatDateTime } from '@/utils/format'
import { inventoryApi, num, type Waste } from '../api/inventoryApi'
import { WasteForm } from './WasteForm'

const TONE = { PROPOSED: 'warning', CONFIRMED: 'success', REJECTED: 'neutral' } as const
const LABEL = { PROPOSED: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', REJECTED: 'Từ chối' } as const

/** UC-20: Chủ quán/Quản lý xác nhận phiếu hao hụt do pha chế đề xuất; xác nhận mới trừ tồn kho (BR-016). */
export function WasteTab() {
  const list = useQuery({ queryKey: ['inventory', 'waste'], queryFn: () => inventoryApi.waste() })
  const [adding, setAdding] = useState(false)
  const decide = useAction(
    (v: { id: number; confirm: boolean }) => inventoryApi.decideWaste(v.id, v.confirm),
    {
      invalidate: [['inventory']],
      success: (w) =>
        w.status === 'CONFIRMED' ? 'Đã xác nhận, tồn kho đã được trừ' : 'Đã từ chối phiếu',
    },
  )
  const columns = [
    { header: 'Lập lúc', cell: (w: Waste) => formatDateTime(w.createdAt) },
    { header: 'Người lập', cell: (w: Waste) => w.createdBy },
    { header: 'Nguyên liệu', cell: (w: Waste) => `${w.ingredient}: ${num(w.quantity)} ${w.unit}` },
    { header: 'Lý do', cell: (w: Waste) => w.reason },
    {
      header: 'Trạng thái',
      cell: (w: Waste) => <Badge tone={TONE[w.status]}>{LABEL[w.status]}</Badge>,
    },
    {
      header: '',
      cell: (w: Waste) =>
        w.status === 'PROPOSED' ? (
          <div className="flex gap-2">
            <Button
              loading={decide.isPending}
              onClick={() => decide.mutate({ id: w.id, confirm: true })}
            >
              Xác nhận
            </Button>
            <Button
              variant="secondary"
              loading={decide.isPending}
              onClick={() => decide.mutate({ id: w.id, confirm: false })}
            >
              Từ chối
            </Button>
          </div>
        ) : (
          w.confirmedBy && <span className="text-xs text-ink-soft">{w.confirmedBy}</span>
        ),
    },
  ]
  return (
    <>
      <Card className="mb-4 flex items-center justify-end gap-3">
        <Button variant="secondary" onClick={() => setAdding(true)}>
          Lập phiếu hao hụt
        </Button>
      </Card>
      <QueryState isPending={list.isPending} error={list.error} onRetry={() => void list.refetch()}>
        <DataTable
          rows={list.data ?? []}
          rowKey={(w) => w.id}
          columns={columns}
          empty="Chưa có phiếu hao hụt."
        />
      </QueryState>
      {adding && <WasteForm onClose={() => setAdding(false)} />}
    </>
  )
}
