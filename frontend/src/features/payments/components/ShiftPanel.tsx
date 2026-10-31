import { useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { QueryState } from '@/components/feedback/QueryState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { NumberField, SelectField } from '@/components/ui/Field'
import { useAction } from '@/hooks/useAction'
import { formatDate, formatDateTime, formatMoney, SHIFT_LABEL } from '@/utils/format'
import { paymentsApi, type DayShift, type ShiftDay, type ShiftState } from '../api/paymentsApi'

const KEY = [['ops'], ['day']]

/** Form mở ca: dùng trong tab Ca thu ngân và trong hộp thoại ở các tab cần ca đang mở. */
export function OpenShiftForm({
  onDone,
  fixedType,
}: {
  onDone?: () => void
  /** Mở đúng ca này (ô ca sáng/ca tối); không truyền thì cho chọn ca. */
  fixedType?: 'MORNING' | 'EVENING'
}) {
  const [picked, setType] = useState<'MORNING' | 'EVENING'>('MORNING')
  const type = fixedType ?? picked
  const [cash, setCash] = useState('0')
  const open = useAction(() => paymentsApi.openShift(type, Number(cash || 0)), {
    invalidate: KEY,
    success: 'Đã mở ca thu ngân',
    onDone,
  })
  return (
    <div className="flex flex-col gap-3">
      {!fixedType && (
        <SelectField
          label="Ca"
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
        >
          <option value="MORNING">Ca sáng (07:00 – 14:30)</option>
          <option value="EVENING">Ca tối (14:30 – 22:00)</option>
        </SelectField>
      )}
      <NumberField
        label="Tiền mặt đầu ca (đồng)"
        value={cash}
        onValueChange={setCash}
        maxLength={9}
      />
      <Button loading={open.isPending} onClick={() => open.mutate(undefined)}>
        Mở ca
      </Button>
    </div>
  )
}

export function OpenShiftDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Mở ca thu ngân" onClose={onClose}>
      <OpenShiftForm onDone={onClose} />
    </Modal>
  )
}

const SHIFT_HOURS = { MORNING: '07:00 – 14:30', EVENING: '14:30 – 22:00' } as const

function Tile({
  label,
  value,
  sub,
  strong,
}: {
  label: string
  value: string
  sub?: string
  strong?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${strong ? 'border-brass/50 bg-coffee-100' : 'border-line bg-white/60'}`}
    >
      <p className="whitespace-nowrap text-sm text-ink-soft">{label}</p>
      <p className="whitespace-nowrap text-xl font-bold">{value}</p>
      {sub && <p className="whitespace-nowrap text-xs text-ink-soft">{sub}</p>}
    </div>
  )
}

function SlotHead({
  type,
  badge,
  note,
}: {
  type: 'MORNING' | 'EVENING'
  badge: ReactNode
  note?: string
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 whitespace-nowrap">
      <h3 className="flex items-center gap-2 text-lg font-bold">
        {SHIFT_LABEL[type]} {badge}
      </h3>
      <p className="text-sm text-ink-soft">{note ?? SHIFT_HOURS[type]}</p>
    </div>
  )
}

/** Ca đang mở: số liệu tạm tính và chốt ca. */
function OpenSlot({ shift, s }: { shift: DayShift; s: ShiftState }) {
  const [actual, setActual] = useState('')
  const close = useAction(() => paymentsApi.closeShift(Number(actual)), {
    invalidate: KEY,
    success: 'Đã chốt ca',
    onDone: () => setActual(''),
  })
  const blocked = (s.drafts ?? 0) > 0 || (s.undelivered ?? 0) > 0
  return (
    <>
      <SlotHead
        type={shift.type}
        badge={<Badge tone="success">Đang mở</Badge>}
        note={`Mở lúc ${formatDateTime(shift.openedAt)}`}
      />
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Tile label="Tiền mặt đầu ca" value={formatMoney(shift.openingCash)} />
        <Tile label="Doanh thu tiền mặt" value={formatMoney(s.cashSales ?? 0)} />
        <Tile
          label="Chuyển khoản/QR"
          value={formatMoney(shift.transferSales ?? 0)}
          sub={`${shift.transferCount ?? 0} đơn`}
        />
        <Tile label="Tiền mặt dự kiến" value={formatMoney(s.expected ?? 0)} strong />
      </div>
      {(s.drafts ?? 0) > 0 && (
        <p role="alert" className="mb-3 rounded-2xl bg-warning-bg px-4 py-2 text-warning">
          Còn {s.drafts} đơn nháp chưa xác nhận hoặc hủy; cần xử lý trước khi chốt ca.
        </p>
      )}
      {(s.undelivered ?? 0) > 0 && (
        <p role="alert" className="mb-3 rounded-2xl bg-warning-bg px-4 py-2 text-warning">
          Còn {s.undelivered} đơn mang đi chưa giao khách; cần giao xong trước khi chốt ca.
        </p>
      )}
      <NumberField
        label="Tiền mặt kiểm đếm thực tế (đồng)"
        value={actual}
        onValueChange={setActual}
        maxLength={10}
      />
      <Button
        className="mt-3 w-full"
        disabled={actual === '' || blocked}
        loading={close.isPending}
        onClick={() => close.mutate(undefined)}
      >
        Chốt ca
      </Button>
    </>
  )
}

/** Ca đã chốt: tiền dự kiến, thực tế, chênh lệch và chuyển khoản. */
function ClosedSlot({ shift }: { shift: DayShift }) {
  const diff = shift.diff ?? 0
  return (
    <>
      <SlotHead
        type={shift.type}
        badge={<Badge>Đã chốt</Badge>}
        note={`Chốt lúc ${formatDateTime(shift.closedAt)}`}
      />
      <div className="grid grid-cols-2 gap-3">
        <Tile label="Tiền mặt dự kiến" value={formatMoney(shift.expectedCash ?? 0)} />
        <Tile label="Tiền mặt thực tế" value={formatMoney(shift.actualCash ?? 0)} />
        <Tile
          label="Chuyển khoản/QR"
          value={formatMoney(shift.transferSales ?? 0)}
          sub={`${shift.transferCount ?? 0} đơn`}
        />
        <div
          className={`flex flex-col justify-center rounded-2xl px-4 py-3 ${diff === 0 ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}
        >
          <p className="whitespace-nowrap text-sm">Chênh lệch</p>
          <p className="whitespace-nowrap text-xl font-bold">
            {diff === 0 ? 'Khớp tiền' : formatMoney(diff)}
          </p>
        </div>
      </div>
    </>
  )
}

/** Ca chưa mở trong ngày: mở được khi không còn ca nào đang mở. */
function EmptySlot({ type, canOpen }: { type: 'MORNING' | 'EVENING'; canOpen: boolean }) {
  return (
    <>
      <SlotHead type={type} badge={<Badge tone="warning">Chưa mở</Badge>} />
      {canOpen ? (
        <OpenShiftForm fixedType={type} />
      ) : (
        <p className="py-8 text-center text-ink-soft">Mở được sau khi chốt ca đang mở.</p>
      )}
    </>
  )
}

function DayTotals({ day }: { day: ShiftDay }) {
  return (
    <dl className="flex flex-wrap items-center gap-x-6 gap-y-1 whitespace-nowrap text-sm">
      <div className="flex gap-1.5">
        <dt className="text-ink-soft">Tiền mặt</dt>
        <dd className="font-semibold">{formatMoney(day.cashTotal)}</dd>
      </div>
      <div className="flex gap-1.5">
        <dt className="text-ink-soft">Chuyển khoản/QR</dt>
        <dd className="font-semibold">{formatMoney(day.transferTotal)}</dd>
      </div>
      <div className="flex gap-1.5">
        <dt className="text-ink-soft">Số đơn</dt>
        <dd className="font-semibold">{day.invoiceCount}</dd>
      </div>
    </dl>
  )
}

/** Ngày trước: một dòng gọn, mở ra thấy từng ca của ngày đó. */
function PastDay({ day }: { day: ShiftDay }) {
  const off = day.shifts.some((c) => (c.diff ?? 0) !== 0)
  return (
    <details className="group py-3 first:pt-0 last:pb-0">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-x-4 gap-y-1 whitespace-nowrap">
        <span className="font-semibold">{formatDate(day.date)}</span>
        <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <DayTotals day={day} />
          {day.shifts.length > 0 && (
            <Badge tone={off ? 'danger' : 'success'}>{off ? 'Có chênh lệch' : 'Khớp tiền'}</Badge>
          )}
        </span>
      </summary>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {day.shifts.map((c) => (
          <li key={c.id} className="rounded-2xl border border-line bg-white/60 px-4 py-3 text-sm">
            <p className="mb-1 font-semibold">{SHIFT_LABEL[c.type]}</p>
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 whitespace-nowrap">
              <dt className="text-ink-soft">Dự kiến</dt>
              <dd>{formatMoney(c.expectedCash ?? 0)}</dd>
              <dt className="text-ink-soft">Thực tế</dt>
              <dd>{formatMoney(c.actualCash ?? 0)}</dd>
              <dt className="text-ink-soft">Chuyển khoản ({c.transferCount ?? 0} đơn)</dt>
              <dd>{formatMoney(c.transferSales ?? 0)}</dd>
              <dt className="text-ink-soft">Chênh lệch</dt>
              <dd className={(c.diff ?? 0) === 0 ? 'text-success' : 'font-semibold text-danger'}>
                {(c.diff ?? 0) === 0 ? 'Khớp' : formatMoney(c.diff ?? 0)}
              </dd>
            </dl>
          </li>
        ))}
      </ul>
    </details>
  )
}

/** UC-30 mở ca (tiền mặt đầu ca) và UC-31 chốt ca (tiền kiểm đếm, chênh lệch so với dự kiến, BR-036); hiện đủ ca sáng và ca tối của hôm nay và 7 ngày gần nhất. */
export function ShiftPanel() {
  const shift = useQuery({ queryKey: ['ops', 'shift'], queryFn: paymentsApi.shift })
  const s = shift.data
  const today = s?.days?.[0]
  const past = (s?.days ?? []).slice(1).filter((d) => d.shifts.length > 0)

  return (
    <QueryState
      isPending={shift.isPending}
      error={shift.error}
      onRetry={() => void shift.refetch()}
    >
      {s && today && (
        <div className="flex flex-col gap-5">
          <section aria-label="Ca hôm nay">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
              <h2 className="whitespace-nowrap text-lg font-bold">
                Hôm nay · {formatDate(today.date)}
              </h2>
              {today.shifts.length > 0 && <DayTotals day={today} />}
            </div>
            <div className="grid items-start gap-4 md:grid-cols-2">
              {(['MORNING', 'EVENING'] as const).map((type) => {
                const sh = today.shifts.find((c) => c.type === type)
                return (
                  <Card key={type}>
                    {sh?.open ? (
                      <OpenSlot shift={sh} s={s} />
                    ) : sh ? (
                      <ClosedSlot shift={sh} />
                    ) : (
                      <EmptySlot type={type} canOpen={!s.open} />
                    )}
                  </Card>
                )
              })}
            </div>
          </section>
          <section aria-label="Các ngày trước">
            <h2 className="mb-3 text-lg font-bold">7 ngày gần nhất</h2>
            <Card>
              {past.length === 0 ? (
                <p className="py-4 text-center text-ink-soft">
                  Chưa có ca nào trong các ngày trước.
                </p>
              ) : (
                <div className="divide-y divide-line">
                  {past.map((d) => (
                    <PastDay key={d.date} day={d} />
                  ))}
                </div>
              )}
            </Card>
          </section>
        </div>
      )}
    </QueryState>
  )
}
