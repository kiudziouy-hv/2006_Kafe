import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { QueryState } from '@/components/feedback/QueryState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { NumberField, SelectField } from '@/components/ui/Field'
import { useAction } from '@/hooks/useAction'
import { formatDateTime, formatMoney, SHIFT_LABEL } from '@/utils/format'
import { paymentsApi } from '../api/paymentsApi'

const KEY = [['ops'], ['day']]

/** UC-30 mở ca (tiền mặt đầu ca) và UC-31 chốt ca (tiền kiểm đếm, chênh lệch so với dự kiến, BR-036). */
export function ShiftPanel() {
  const shift = useQuery({ queryKey: ['ops', 'shift'], queryFn: paymentsApi.shift })
  const [type, setType] = useState<'MORNING' | 'EVENING'>('MORNING')
  const [cash, setCash] = useState('0')
  const [actual, setActual] = useState('')
  const open = useAction(() => paymentsApi.openShift(type, Number(cash || 0)), {
    invalidate: KEY,
    success: 'Đã mở ca thu ngân',
  })
  const close = useAction(() => paymentsApi.closeShift(Number(actual)), {
    invalidate: KEY,
    success: 'Đã chốt ca',
    onDone: () => setActual(''),
  })
  const s = shift.data

  return (
    <QueryState
      isPending={shift.isPending}
      error={shift.error}
      onRetry={() => void shift.refetch()}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {s?.open && s.shift ? (
          <Card>
            <h2 className="mb-2 text-lg font-bold">
              {SHIFT_LABEL[s.shift.type]} <Badge tone="success">Đang mở</Badge>
            </h2>
            <dl className="mb-3 grid grid-cols-[1fr_auto] gap-y-1">
              <dt>Mở lúc</dt>
              <dd>{formatDateTime(s.shift.openedAt)}</dd>
              <dt>Tiền mặt đầu ca</dt>
              <dd>{formatMoney(s.shift.openingCash)}</dd>
              <dt>Doanh thu tiền mặt</dt>
              <dd>{formatMoney(s.cashSales ?? 0)}</dd>
              <dt className="font-bold">Tiền mặt dự kiến</dt>
              <dd className="font-bold">{formatMoney(s.expected ?? 0)}</dd>
            </dl>
            {(s.drafts ?? 0) > 0 && (
              <p role="alert" className="mb-3 rounded-2xl bg-warning-bg px-4 py-2 text-warning">
                Còn {s.drafts} đơn nháp chưa xác nhận hoặc hủy; cần xử lý trước khi chốt ca.
              </p>
            )}
            <NumberField
              label="Tiền mặt kiểm đếm thực tế (đồng)"
              value={actual}
              onValueChange={setActual}
            />
            <Button
              className="mt-3 w-full"
              disabled={actual === '' || (s.drafts ?? 0) > 0}
              loading={close.isPending}
              onClick={() => close.mutate(undefined)}
            >
              Chốt ca
            </Button>
          </Card>
        ) : (
          <Card>
            <h2 className="mb-3 text-lg font-bold">Mở ca thu ngân</h2>
            <div className="flex flex-col gap-3">
              <SelectField
                label="Ca"
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
              >
                <option value="MORNING">Ca sáng (07:00 – 14:30)</option>
                <option value="EVENING">Ca tối (14:30 – 22:00)</option>
              </SelectField>
              <NumberField label="Tiền mặt đầu ca (đồng)" value={cash} onValueChange={setCash} />
              <Button loading={open.isPending} onClick={() => open.mutate(undefined)}>
                Mở ca
              </Button>
            </div>
          </Card>
        )}
        {s?.lastClosed && (
          <Card>
            <h2 className="mb-2 text-lg font-bold">Ca đã chốt gần nhất</h2>
            <dl className="grid grid-cols-[1fr_auto] gap-y-1">
              <dt>Ca</dt>
              <dd>{SHIFT_LABEL[s.lastClosed.type]}</dd>
              <dt>Chốt lúc</dt>
              <dd>{formatDateTime(s.lastClosed.closedAt)}</dd>
              <dt>Tiền dự kiến</dt>
              <dd>{formatMoney(s.lastClosed.expectedCash)}</dd>
              <dt>Tiền thực tế</dt>
              <dd>{formatMoney(s.lastClosed.actualCash)}</dd>
              <dt className="font-bold">Chênh lệch</dt>
              <dd className={s.lastClosed.diff === 0 ? 'font-bold' : 'font-bold text-danger'}>
                {formatMoney(s.lastClosed.diff)}
              </dd>
            </dl>
          </Card>
        )}
      </div>
    </QueryState>
  )
}
