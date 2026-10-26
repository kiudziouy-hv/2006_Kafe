import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { useToast } from '@/components/feedback/Toaster'
import { QueryState } from '@/components/feedback/QueryState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth'
import { toApiError } from '@/lib/http'
import type { DiningTable, TableStatus } from '@/types/api'
import { tablesApi } from '../api/tablesApi'

const LABEL: Record<TableStatus, string> = {
  EMPTY: 'Trống',
  SERVING: 'Đang phục vụ',
  WAITING_PAY: 'Chờ thanh toán',
}
const TONE = { EMPTY: 'neutral', SERVING: 'warning', WAITING_PAY: 'danger' } as const

/** UC-07..11: sơ đồ bàn (bấm bàn để gọi món) theo khu vực. Dữ liệu tự làm mới khi có thông báo thời gian thực. */
export default function TablesPage() {
  const qc = useQueryClient()
  const { notify } = useToast()
  const { user } = useAuth()
  const base = user?.role === 'OWNER' ? '/admin/tables' : '/service/tables'
  const tables = useQuery({ queryKey: ['ops', 'tables'], queryFn: tablesApi.list })
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
      {zones.map(([zone, list]) => (
        <section key={zone} className="mb-6">
          <h2 className="mb-2 text-lg font-bold">
            {zone} ({list.length} bàn)
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {list.map((t) => (
              <article
                key={t.no}
                className={clsx(
                  'vt-hover-lift rounded-2xl border p-4',
                  t.status === 'EMPTY'
                    ? 'border-brass/50 bg-gradient-to-br from-ivory to-coffee-50'
                    : 'border-brass bg-gradient-to-br from-coffee-200 to-coffee-300/80',
                )}
              >
                <h3 className="text-xl font-bold">Bàn {t.no}</h3>
                <Badge tone={TONE[t.status]}>{LABEL[t.status]}</Badge>
                <Link
                  to={`${base}/${t.no}`}
                  className="vt-btn vt-btn-primary mt-3 block rounded-xl px-4 py-2 text-center font-semibold"
                >
                  {t.status === 'EMPTY' ? 'Gọi món' : 'Xem đơn / gọi thêm'}
                </Link>
                {t.status === 'SERVING' && t.orderId !== null && (
                  <Button
                    variant="secondary"
                    className="mt-3 w-full"
                    loading={finish.isPending}
                    onClick={() => finish.mutate(t.orderId!)}
                  >
                    Khách đã dùng xong
                  </Button>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </QueryState>
  )
}
