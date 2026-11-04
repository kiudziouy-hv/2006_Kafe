import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { LayoutGrid } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '@/components/feedback/Toaster'
import { QueryState } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/features/auth'
import { toApiError } from '@/lib/http'
import type { DiningTable, TableStatus } from '@/types/api'
import { tablesApi } from '../api/tablesApi'

const LABEL: Record<TableStatus, string> = {
  EMPTY: 'Trống',
  SERVING: 'Đang phục vụ',
  WAITING_PAY: 'Chờ thanh toán',
}

const STYLE: Record<TableStatus, string> = {
  EMPTY: 'border-coffee-600/50 bg-white',
  SERVING: 'border-coffee-600/60 bg-[#dacbb1]',
  WAITING_PAY: 'border-dashed border-brass-dark bg-[#e9d79b]',
}

const CARD = 'vt-hover-lift relative rounded-2xl border p-4'

/**
 * Sơ đồ bàn theo khu vực (UC-07). `order`: Phục vụ bấm bàn để gọi món/xem đơn và báo khách dùng xong (UC-08..11).
 * `readonly`: Thu ngân chỉ xem, chỉ bàn Chờ thanh toán bấm được để sang UC-22 (ASM-02, UC-07 luồng 3c).
 */
export function TableGrid({
  mode,
  onSelect,
  note,
}: {
  mode: 'order' | 'readonly'
  onSelect?: (t: DiningTable) => void
  /** Dòng phụ dưới trạng thái bàn ở chế độ readonly (tổng tiền, "Chưa thể thanh toán"). */
  note?: (t: DiningTable) => ReactNode
}) {
  // Sự kiện bàn có khách mới chỉ gửi cho Bếp, nên sơ đồ của Thu ngân tự tải lại định kỳ để thấy bàn chuyển Đang phục vụ
  const tables = useQuery({
    queryKey: ['ops', 'tables'],
    queryFn: tablesApi.list,
    refetchInterval: mode === 'readonly' ? 15_000 : false,
  })

  const zones = [
    ...(tables.data ?? []).reduce(
      (m, t) => m.set(t.zone, [...(m.get(t.zone) ?? []), t]),
      new Map<string, DiningTable[]>(),
    ),
  ]

  return (
    <QueryState
      isPending={tables.isPending}
      error={tables.error}
      onRetry={() => void tables.refetch()}
    >
      {mode === 'readonly' && tables.data?.length === 0 && (
        <EmptyState icon={LayoutGrid}>Chưa có bàn nào.</EmptyState>
      )}
      {mode === 'readonly' && !!tables.data?.length && <Legend />}
      {zones.map(([zone, list]) => (
        <section key={zone} className="mb-7">
          <h2 className="mb-3 text-lg font-semibold">{zone}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((t) =>
              mode === 'order' ? (
                <OrderCard key={t.no} t={t} />
              ) : (
                <ReadonlyCard key={t.no} t={t} onSelect={onSelect} note={note?.(t)} />
              ),
            )}
          </div>
        </section>
      ))}
    </QueryState>
  )
}

function Legend() {
  return (
    <ul aria-label="Chú thích trạng thái bàn" className="mb-4 flex flex-wrap gap-4 text-sm">
      {(Object.keys(LABEL) as TableStatus[]).map((s) => (
        <li key={s} className="flex items-center gap-2">
          <span className={clsx('size-4 rounded border', STYLE[s])} aria-hidden />
          {LABEL[s]}
        </li>
      ))}
    </ul>
  )
}

function OrderCard({ t }: { t: DiningTable }) {
  const qc = useQueryClient()
  const { notify } = useToast()
  const { user } = useAuth()
  const base = user?.role === 'OWNER' ? '/admin/tables' : '/service/tables'
  const finish = useMutation({
    mutationFn: tablesApi.finish,
    onSuccess: () => {
      notify({ tone: 'success', title: 'Đã chuyển bàn sang Chờ thanh toán' })
      void qc.invalidateQueries({ queryKey: ['ops'] })
    },
    onError: (e) =>
      notify({
        tone: 'danger',
        title: 'Không thể hoàn tất bàn',
        description: toApiError(e).message,
      }),
  })
  return (
    <article className={clsx(CARD, STYLE[t.status])}>
      <Link
        to={`${base}/${t.no}`}
        aria-label={`${t.status === 'EMPTY' ? 'Gọi món' : 'Xem đơn'} bàn ${t.no}`}
        className="block rounded-xl outline-offset-4 after:absolute after:inset-0 after:rounded-2xl"
      >
        <h3 className="text-xl font-bold">Bàn {t.no}</h3>
        <p className="text-sm text-ink-soft">{LABEL[t.status]}</p>
      </Link>
      {t.status === 'SERVING' && t.orderId !== null && (
        <Button
          variant="secondary"
          className="relative z-10 mt-3 w-full"
          loading={finish.isPending}
          onClick={() => finish.mutate(t.orderId!)}
        >
          Khách đã dùng xong
        </Button>
      )}
    </article>
  )
}

function ReadonlyCard({
  t,
  onSelect,
  note,
}: {
  t: DiningTable
  onSelect?: (t: DiningTable) => void
  note?: ReactNode
}) {
  const body = (
    <>
      <h3 className="text-xl font-bold">Bàn {t.no}</h3>
      <p className="text-sm text-ink-soft">{LABEL[t.status]}</p>
      {note && <div className="mt-1 text-sm">{note}</div>}
    </>
  )
  if (t.status === 'WAITING_PAY')
    return (
      <button
        type="button"
        aria-label={`Thanh toán bàn ${t.no}`}
        className={clsx(CARD, STYLE[t.status], 'text-left outline-offset-4')}
        onClick={() => onSelect?.(t)}
      >
        {body}
      </button>
    )
  return (
    <article aria-disabled="true" className={clsx(CARD, STYLE[t.status])}>
      {body}
    </article>
  )
}
