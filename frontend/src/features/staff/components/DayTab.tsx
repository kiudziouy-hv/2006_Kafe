import { useQuery } from '@tanstack/react-query'
import { CircleCheck } from 'lucide-react'
import { useState } from 'react'
import { QueryState } from '@/components/feedback/QueryState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TextAreaField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useAction } from '@/hooks/useAction'
import { formatDate, formatDateTime, formatMoney, SHIFT_LABEL } from '@/utils/format'
import { staffApi, type DaySession } from '../api/staffApi'

const KEY = [['day'], ['ops', 'shift']]

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  )
}

/** Ô một ca của ngày: chưa mở, đang mở hoặc đã chốt kèm số liệu đối chiếu tiền mặt. */
function ShiftCard({ shift, session }: { shift: 'MORNING' | 'EVENING'; session?: DaySession }) {
  const closed = session?.status === 'CLOSED'
  const diff = Number(session?.difference ?? 0)
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{SHIFT_LABEL[shift]}</h2>
        <Badge tone={!session ? 'neutral' : closed ? 'success' : 'warning'}>
          {!session ? 'Chưa mở' : closed ? 'Đã chốt' : 'Đang mở'}
        </Badge>
      </div>
      {!session ? (
        <p className="py-4 text-ink-soft">Thu ngân chưa mở ca này.</p>
      ) : (
        <dl className="divide-y divide-line">
          <Row label="Mở lúc">
            {formatDateTime(session.openedAt)} · {session.openedBy}
          </Row>
          <Row label="Tiền đầu ca">{formatMoney(session.openingCash)}</Row>
          <Row label="Hóa đơn">
            {session.invoices} · {formatMoney(Number(session.revenue))}
          </Row>
          {closed ? (
            <>
              <Row label="Tiền mặt dự kiến">{formatMoney(Number(session.expectedCash))}</Row>
              <Row label="Tiền mặt thực tế">{formatMoney(Number(session.actualCash))}</Row>
              <Row label="Chênh lệch">
                <span className={diff === 0 ? 'text-success' : 'text-danger'}>
                  {diff === 0 ? 'Khớp tiền' : `${diff > 0 ? '+' : ''}${formatMoney(diff)}`}
                </span>
              </Row>
              <Row label="Chốt bởi">{session.closedBy ?? '—'}</Row>
            </>
          ) : (
            <Row label="Chốt ca">Thu ngân chốt khi hết ca</Row>
          )}
        </dl>
      )}
    </Card>
  )
}

/** UC-32 chốt ngày (BR-037, BR-038); chốt ca là việc của thu ngân. */
export function DayTab() {
  const day = useQuery({ queryKey: ['day'], queryFn: staffApi.day })
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const closeDay = useAction(() => staffApi.closeDay(note), {
    invalidate: KEY,
    success: 'Đã chốt ngày kinh doanh',
    onDone: () => {
      setOpen(false)
      setNote('')
    },
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

          <div className="grid gap-4 md:grid-cols-2">
            {(['MORNING', 'EVENING'] as const).map((shift) => (
              <ShiftCard
                key={shift}
                shift={shift}
                session={state.sessions.find((s) => s.shift === shift)}
              />
            ))}
          </div>

          {state.status === 'CLOSED' ? (
            <Card>
              <p className="flex items-center gap-2 font-semibold text-success">
                <CircleCheck size={20} aria-hidden /> Đã chốt ngày
                {state.closedAt ? ` lúc ${formatDateTime(state.closedAt)}` : ''}
              </p>
              {state.note && <p className="mt-2 whitespace-pre-line">{state.note}</p>}
            </Card>
          ) : state.status === 'OPEN' ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={!state.canClose} onClick={() => setOpen(true)}>
                Chốt ngày
              </Button>
              {!state.canClose && (
                <p className="text-sm text-ink-soft">
                  {!state.eveningClosed
                    ? 'Chốt được sau khi thu ngân chốt ca tối.'
                    : `Còn ${state.openOrders.length} đơn mở, ${state.busyTables.length} bàn chưa Trống.`}
                </p>
              )}
            </div>
          ) : null}
          {open && (
            <Modal title="Chốt ngày kinh doanh" onClose={() => setOpen(false)}>
              <div className="flex flex-col gap-3">
                <TextAreaField
                  label="Ghi chú chốt ngày (không bắt buộc)"
                  value={note}
                  maxLength={500}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button loading={closeDay.isPending} onClick={() => closeDay.mutate(undefined)}>
                  Xác nhận chốt ngày
                </Button>
              </div>
            </Modal>
          )}
        </div>
      )}
    </QueryState>
  )
}
