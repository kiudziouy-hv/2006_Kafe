import { TabAction } from '@/components/ui/Tabs'
import { useQuery } from '@tanstack/react-query'
import { LogIn, LogOut } from 'lucide-react'
import { useState } from 'react'
import { QueryState } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { SelectField, TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useAction } from '@/hooks/useAction'
import { formatDateTime, SHIFT_LABEL, todayIso } from '@/utils/format'
import { isoToLocal, localToIso, staffApi, type AttendanceRecord } from '../api/staffApi'

const KEY = [['attendance']]

/** UC-29: Chủ quán/Quản lý chỉnh sửa hoặc bổ sung chấm công; mỗi lần lưu ghi lịch sử trước/sau (BR-039). */
export function AttendanceTab() {
  const [from, setFrom] = useState(todayIso(-6))
  const [to, setTo] = useState(todayIso())
  const [range, setRange] = useState<[string, string]>([from, to])
  const list = useQuery({
    queryKey: ['attendance', range],
    queryFn: () => staffApi.attendance(range[0], range[1]),
  })
  const [editing, setEditing] = useState<AttendanceRecord | 'new' | null>(null)
  const [history, setHistory] = useState<AttendanceRecord | null>(null)
  return (
    <>
      <MyAttendance />
      <form
        className="mb-4 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          setRange([from, to])
        }}
      >
        <TextField
          label="Từ ngày"
          type="date"
          value={from}
          max={to || todayIso()}
          onChange={(e) => setFrom(e.target.value)}
        />
        <TextField
          label="Đến ngày"
          type="date"
          value={to}
          min={from}
          max={todayIso()}
          onChange={(e) => setTo(e.target.value)}
        />
        <Button type="submit" disabled={from > to}>
          Xem
        </Button>
      </form>
      <TabAction>
        <Button onClick={() => setEditing('new')}>Bổ sung chấm công</Button>
      </TabAction>
      <QueryState isPending={list.isPending} error={list.error} onRetry={() => void list.refetch()}>
        <DataTable
          rows={list.data ?? []}
          rowKey={(a) => a.id}
          empty="Chưa có chấm công trong khoảng này."
          columns={[
            {
              header: 'Nhân viên',
              cell: (a) => <span className="font-semibold">{a.fullName}</span>,
            },
            { header: 'Ca', cell: (a) => SHIFT_LABEL[a.shift] },
            { header: 'Vào', cell: (a) => formatDateTime(a.checkIn) },
            {
              header: 'Ra',
              cell: (a) =>
                a.checkOut ? (
                  formatDateTime(a.checkOut)
                ) : (
                  <span className="text-warning">Chưa chấm công ra</span>
                ),
            },
            {
              header: '',
              cell: (a) => (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setEditing(a)}>
                    Chỉnh sửa
                  </Button>
                  {a.edits > 0 && (
                    <Button variant="ghost" onClick={() => setHistory(a)}>
                      Lịch sử ({a.edits})
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </QueryState>
      {editing && (
        <AttendanceForm
          record={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {history && <History record={history} onClose={() => setHistory(null)} />}
    </>
  )
}

/** Quản lý cũng chấm công như nhân viên: đã đăng nhập nên không cần PIN. */
function MyAttendance() {
  const mine = useQuery({ queryKey: ['attendance', 'me'], queryFn: staffApi.myAttendance })
  const [shift, setShift] = useState('MORNING')
  const checkIn = useAction(() => staffApi.checkInSelf(shift), {
    invalidate: KEY,
    success: 'Đã chấm công vào',
  })
  const checkOut = useAction(staffApi.checkOutSelf, { invalidate: KEY, success: 'Đã chấm công ra' })
  const open = mine.data && 'id' in mine.data ? mine.data : null
  return (
    <Card className="mb-4">
      <QueryState isPending={mine.isPending} error={mine.error} onRetry={() => void mine.refetch()}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Chấm công của tôi</h2>
            <p className="text-ink-soft">
              {open
                ? `Đang làm ${SHIFT_LABEL[open.shift].toLowerCase()}, vào lúc ${formatDateTime(open.checkIn)}`
                : 'Bạn chưa chấm công vào.'}
            </p>
          </div>
          {open ? (
            <Button
              variant="secondary"
              loading={checkOut.isPending}
              onClick={() => checkOut.mutate(undefined)}
            >
              <LogOut size={16} aria-hidden /> Chấm công ra
            </Button>
          ) : (
            <div className="flex items-end gap-3">
              <SelectField label="Ca" value={shift} onChange={(e) => setShift(e.target.value)}>
                <option value="MORNING">Ca sáng</option>
                <option value="EVENING">Ca tối</option>
              </SelectField>
              <Button loading={checkIn.isPending} onClick={() => checkIn.mutate(undefined)}>
                <LogIn size={16} aria-hidden /> Chấm công vào
              </Button>
            </div>
          )}
        </div>
      </QueryState>
    </Card>
  )
}

function AttendanceForm({
  record,
  onClose,
}: {
  record: AttendanceRecord | null
  onClose: () => void
}) {
  const staff = useQuery({ queryKey: ['staff', 'list'], queryFn: staffApi.list })
  const [employeeId, setEmployeeId] = useState(String(record?.employeeId ?? ''))
  const [shift, setShift] = useState<string>(record?.shift ?? 'MORNING')
  const [checkIn, setCheckIn] = useState(isoToLocal(record?.checkIn ?? null))
  const [checkOut, setCheckOut] = useState(isoToLocal(record?.checkOut ?? null))
  const save = useAction(
    () => {
      const body = {
        shift,
        checkIn: localToIso(checkIn),
        checkOut: checkOut ? localToIso(checkOut) : null,
      }
      return record
        ? staffApi.editAttendance(record.id, body)
        : staffApi.addAttendance({ employeeId: Number(employeeId), ...body })
    },
    { invalidate: KEY, success: 'Đã lưu chấm công và ghi lịch sử chỉnh sửa', onDone: onClose },
  )
  return (
    <Modal
      title={record ? `Chỉnh sửa chấm công: ${record.fullName}` : 'Bổ sung chấm công'}
      onClose={onClose}
    >
      <div className="flex flex-col gap-3">
        {!record && (
          <SelectField
            label="Nhân viên"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="">— Chọn —</option>
            {(staff.data ?? [])
              .filter((s) => !s.station)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
          </SelectField>
        )}
        <SelectField label="Ca" value={shift} onChange={(e) => setShift(e.target.value)}>
          <option value="MORNING">Ca sáng (07:00 – 14:30)</option>
          <option value="EVENING">Ca tối (14:30 – 22:00)</option>
        </SelectField>
        <TextField
          label="Giờ vào"
          type="datetime-local"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
        />
        <TextField
          label="Giờ ra"
          type="datetime-local"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
        />
        <Button
          disabled={!checkIn || (!record && !employeeId)}
          loading={save.isPending}
          onClick={() => save.mutate(undefined)}
        >
          Lưu
        </Button>
      </div>
    </Modal>
  )
}

function History({ record, onClose }: { record: AttendanceRecord; onClose: () => void }) {
  const history = useQuery({
    queryKey: ['attendance', 'history', record.id],
    queryFn: () => staffApi.attendanceHistory(record.id),
  })
  return (
    <Modal title={`Lịch sử chỉnh sửa: ${record.fullName}`} onClose={onClose} wide>
      <QueryState isPending={history.isPending} error={history.error}>
        <DataTable
          rows={history.data ?? []}
          rowKey={(h) => h.id}
          columns={[
            { header: 'Lúc', cell: (h) => formatDateTime(h.editedAt) },
            { header: 'Người sửa', cell: (h) => h.editedBy },
            { header: 'Trước', cell: (h) => <code className="text-xs">{h.oldValue}</code> },
            { header: 'Sau', cell: (h) => <code className="text-xs">{h.newValue}</code> },
          ]}
        />
      </QueryState>
    </Modal>
  )
}
