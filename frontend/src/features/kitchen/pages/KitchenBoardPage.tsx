import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { QueryState } from '@/components/feedback/QueryState'
import { useToast } from '@/components/feedback/Toaster'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ICE_LABEL } from '@/features/orders/api/ordersApi'
import { WasteForm } from '@/features/inventory/components/WasteForm'
import { toApiError } from '@/lib/http'
import type { KitchenLine, LineStatus } from '@/types/api'
import { formatClock } from '@/utils/format'
import { kitchenApi } from '../api/kitchenApi'

const COLUMNS: { status: LineStatus; title: string }[] = [
  { status: 'NEW', title: 'Mới' },
  { status: 'MAKING', title: 'Đang pha' },
  { status: 'DONE', title: 'Đã xong' },
]

function describe(l: KitchenLine): string {
  const parts = [
    l.size,
    l.temp === 'HOT' ? 'Nóng' : l.temp === 'COLD' ? 'Lạnh' : null,
    l.sugar ? `Đường ${l.sugar}%` : null,
    l.ice && l.ice !== '-' ? (ICE_LABEL[l.ice] ?? l.ice) : null,
  ]
  return [...parts, ...l.toppings].filter(Boolean).join(' · ')
}

/** UC-14: bảng pha chế. Bắt đầu pha (Mới → Đang pha, trừ kho) và Hoàn thành (báo Phục vụ/Thu ngân). */
export default function KitchenBoardPage() {
  const qc = useQueryClient()
  const { notify } = useToast()
  const board = useQuery({
    queryKey: ['ops', 'kitchen'],
    queryFn: kitchenApi.board,
    refetchInterval: 20000,
  })
  const onSettled = () => void qc.invalidateQueries({ queryKey: ['ops'] })
  const onError = (e: unknown) =>
    notify({ tone: 'danger', title: 'Không thực hiện được', description: toApiError(e).message })
  const [wasting, setWasting] = useState(false)
  const start = useMutation({ mutationFn: kitchenApi.start, onSettled, onError })
  const done = useMutation({ mutationFn: kitchenApi.done, onSettled, onError })

  return (
    <QueryState
      isPending={board.isPending}
      error={board.error}
      onRetry={() => void board.refetch()}
    >
      <div className="mb-3 flex justify-end">
        <Button variant="secondary" onClick={() => setWasting(true)}>
          Đề xuất hao hụt
        </Button>
      </div>
      {wasting && <WasteForm onClose={() => setWasting(false)} />}
      <div className="grid gap-3 lg:grid-cols-3">
        {COLUMNS.map((c) => {
          const all = (board.data ?? []).filter((l) => l.status === c.status)
          // Cột Đã xong chỉ giữ vài món gần nhất để màn hình gọn
          const lines = c.status === 'DONE' ? all.slice(-6).reverse() : all
          return (
            <section
              key={c.status}
              aria-label={c.title}
              className="rounded-3xl border border-line bg-[#efe5ce] p-4 lg:min-h-[60vh]"
            >
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
                {c.title}
                {c.status === 'NEW' && (
                  <span className="text-sm font-normal text-ink-soft">· FIFO</span>
                )}
                <Badge>{lines.length}</Badge>
              </h2>
              <div className="flex flex-col gap-3">
                {lines.length === 0 && <p className="text-sm text-ink-soft">Không có món.</p>}
                {lines.map((l) => (
                  <Card key={l.id}>
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-lg font-bold">{l.label}</h3>
                      <span className="text-xs text-ink-soft">{formatClock(l.sentAt)}</span>
                    </div>
                    <p className="font-semibold">
                      {l.qty}× {l.name}
                    </p>
                    <p className="text-sm text-ink-soft">{describe(l)}</p>
                    {l.status === 'NEW' && (
                      <Button
                        className="mt-3 w-full"
                        disabled={!l.canStart}
                        loading={start.isPending && start.variables === l.id}
                        onClick={() => start.mutate(l.id)}
                      >
                        {l.canStart ? 'Bắt đầu pha' : 'Thiếu nguyên liệu'}
                      </Button>
                    )}
                    {l.status === 'MAKING' && (
                      <Button
                        className="mt-3 w-full"
                        loading={done.isPending && done.variables === l.id}
                        onClick={() => done.mutate(l.id)}
                      >
                        Hoàn thành
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </QueryState>
  )
}
