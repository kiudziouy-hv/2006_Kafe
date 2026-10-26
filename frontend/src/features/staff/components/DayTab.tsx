import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { QueryState } from '@/components/feedback/QueryState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { NumberField } from '@/components/ui/Field'
import { paymentsApi } from '@/features/payments/api/paymentsApi'
import { useAction } from '@/hooks/useAction'
import { formatDate, formatDateTime, formatMoney, SHIFT_LABEL } from '@/utils/format'
import { staffApi } from '../api/staffApi'

const KEY = [['day'], ['ops', 'shift']]

/** UC-31 (Chủ quán chốt thay phiên ca đang mở, FR-M10-007) và UC-32 chốt ngày (BR-037, BR-038). */
export function DayTab() {
  const day = useQuery({ queryKey: ['day'], queryFn: staffApi.day })
  const shift = useQuery({ queryKey: ['ops', 'shift'], queryFn: paymentsApi.shift })
  const [actual, setActual] = useState('')
  const closeShift = useAction(() => paymentsApi.closeShift(Number(actual)), {
    invalidate: KEY,
    success: 'Đã chốt ca thay thu ngân',
    onDone: () => setActual(''),
  })
  const closeDay = useAction(staffApi.closeDay, {
    invalidate: KEY,
    success: 'Đã chốt ngày kinh doanh',
  })
  const state = day.data

  return (
    <QueryState isPending={day.isPending} error={day.error} onRetry={() => void day.refetch()}>
      {state && (
        <div className="flex flex-col gap-4">
          <p className="text-lg">
            Ngày kinh doanh <b>{formatDate(state.date)}</b>{' '}
            <Badge tone={state.status === 'OPEN' ? 'success' : 'neutral'}>
              {state.status === 'OPEN'
                ? 'Đang mở'
                : state.status === 'CLOSED'
                  ? 'Đã chốt'
                  : 'Chưa mở'}
            </Badge>
          </p>
          <DataTable
            rows={state.sessions}
            rowKey={(s) => s.id}
            empty="Hôm nay chưa mở phiên ca thu ngân nào."
            columns={[
              { header: 'Ca', cell: (s) => SHIFT_LABEL[s.shift] },
              {
                header: 'Trạng thái',
                cell: (s) => (
                  <Badge tone={s.status === 'OPEN' ? 'warning' : 'success'}>
                    {s.status === 'OPEN' ? 'Đang mở' : 'Đã chốt'}
                  </Badge>
                ),
              },
              { header: 'Mở lúc', cell: (s) => `${formatDateTime(s.openedAt)} · ${s.openedBy}` },
              { header: 'Tiền đầu ca', cell: (s) => formatMoney(s.openingCash) },
              {
                header: 'Hóa đơn',
                cell: (s) => `${s.invoices} · ${formatMoney(Number(s.revenue))}`,
              },
              {
                header: 'Dự kiến / thực tế',
                cell: (s) =>
                  s.status === 'CLOSED'
                    ? `${formatMoney(Number(s.expectedCash))} / ${formatMoney(Number(s.actualCash))}`
                    : '—',
              },
              {
                header: 'Chênh lệch',
                cell: (s) => (s.status === 'CLOSED' ? formatMoney(Number(s.difference)) : '—'),
              },
              { header: 'Chốt bởi', cell: (s) => s.closedBy ?? '—' },
            ]}
          />

          {shift.data?.open && shift.data.shift && (
            <Card>
              <h2 className="mb-1 text-lg font-bold">
                Chốt thay phiên ca đang mở ({SHIFT_LABEL[shift.data.shift.type]})
              </h2>
              <p className="mb-3 text-sm text-ink-soft">
                Tiền mặt dự kiến: <b>{formatMoney(shift.data.expected ?? 0)}</b> (đầu ca{' '}
                {formatMoney(shift.data.shift.openingCash)} + doanh thu tiền mặt{' '}
                {formatMoney(shift.data.cashSales ?? 0)}, đã trừ hoàn tiền một phần). Còn{' '}
                {shift.data.drafts ?? 0} đơn nháp chưa xử lý.
              </p>
              <div className="flex items-end gap-3">
                <NumberField
                  label="Tiền mặt kiểm đếm thực tế (đồng)"
                  value={actual}
                  onValueChange={setActual}
                />
                <Button
                  disabled={actual === ''}
                  loading={closeShift.isPending}
                  onClick={() => closeShift.mutate(undefined)}
                >
                  Chốt ca
                </Button>
              </div>
            </Card>
          )}

          <Card>
            <h2 className="mb-2 text-lg font-bold">Chốt ngày</h2>
            {state.status !== 'OPEN' ? (
              <p className="text-ink-soft">Không có ngày kinh doanh nào đang mở.</p>
            ) : (
              <>
                {!state.eveningClosed && (
                  <p className="mb-2 text-warning">
                    Phiên ca tối chưa mở hoặc chưa chốt; cần chốt ca tối trước khi chốt ngày.
                  </p>
                )}
                {state.openOrders.length > 0 && (
                  <div className="mb-2">
                    <p className="font-semibold text-danger">
                      Còn {state.openOrders.length} đơn hàng mở cần xử lý:
                    </p>
                    <ul className="list-disc pl-6">
                      {state.openOrders.map((o) => (
                        <li key={o.id}>
                          {o.label} ({o.status})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {state.busyTables.length > 0 && (
                  <p className="mb-2 text-danger">
                    Bàn chưa Trống: {state.busyTables.map((t) => `Bàn ${t.number}`).join(', ')}.
                  </p>
                )}
                <Button
                  disabled={!state.canClose}
                  loading={closeDay.isPending}
                  onClick={() => closeDay.mutate(undefined)}
                >
                  Chốt ngày kinh doanh
                </Button>
              </>
            )}
          </Card>
        </div>
      )}
    </QueryState>
  )
}
