import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { useToast } from '@/components/feedback/Toaster'
import { QueryState } from '@/components/feedback/QueryState'
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
        <section key={zone} className="mb-7">
          <h2 className="mb-3 text-lg font-semibold">{zone}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((t) => (
              <article
                key={t.no}
                className={clsx(
                  'vt-hover-lift relative rounded-2xl border p-4',
                  t.status === 'EMPTY' && 'border-coffee-600/50 bg-white',
                  t.status === 'SERVING' && 'border-coffee-600/60 bg-[#dacbb1]',
                  t.status === 'WAITING_PAY' && 'border-dashed border-brass-dark bg-[#e9d79b]',
                )}
              >
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
            ))}
          </div>
        </section>
      ))}
    </QueryState>
  )
}
