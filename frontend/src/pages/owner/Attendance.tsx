import { useState } from 'react'
import { Panel, RowMenu, Table } from '../../components/Table'
import { Button, Modal, Select, TextField, DateField } from '../../components/ui'
import { useStore } from '../../store'
import { usePersist } from '../../usePersist'
import OwnerLayout from './OwnerLayout'

type Record_ = { id: string; staff: string; date: string; shift: string; in: string; out?: string }

const STAFF = ['Nhân viên mẫu A', 'Nhân viên mẫu B', 'Nhân viên mẫu C']
const SHIFTS = ['Ca sáng', 'Ca tối']
export const CLOSED_DAYS = ['2026-10-19']
const INITIAL: Record_[] = [
  { id: '1', staff: 'Nhân viên mẫu A', date: '2026-10-20', shift: 'Ca sáng', in: '07:02', out: '14:31' },
  { id: '2', staff: 'Nhân viên mẫu B', date: '2026-10-20', shift: 'Ca sáng', in: '06:58' },
  { id: '3', staff: 'Nhân viên mẫu C', date: '2026-10-20', shift: 'Ca tối', in: '14:29', out: '22:03' },
  { id: '4', staff: 'Nhân viên mẫu A', date: '2026-10-19', shift: 'Ca sáng', in: '07:00', out: '14:30' },
]

// S52 — Chỉnh sửa chấm công; S52b — Thêm; S52c — menu ⋯; S52d — Sửa; S52e — ngày đã chốt
export default function Attendance() {
  const { toast } = useStore()
  const [records, setRecords] = usePersist('attendance', INITIAL)
  const [staff, setStaff] = useState('Tất cả')
  const [date, setDate] = useState('2026-10-20')
  const [shift, setShift] = useState('Tất cả')
  const [editing, setEditing] = useState<Record_ | 'new' | null>(null)

  const rows = records.filter((r) => (staff === 'Tất cả' || r.staff === staff) && (!date || r.date === date) && (shift === 'Tất cả' || r.shift === shift))
  const closed = (d: string) => CLOSED_DAYS.includes(d)

  const tryEdit = (r: Record_) => {
    if (closed(r.date)) return toast({ type: 'error', title: 'Không thể sửa chấm công', message: 'Bản ghi thuộc ngày đã chốt, dữ liệu đã bị khóa.' })
    setEditing(r)
  }

  return (
    <OwnerLayout title="Chấm công nhân viên">
      <div className="grid gap-3 md:grid-cols-3">
        <Select label="Nhân viên" value={staff} onChange={setStaff} options={['Tất cả', ...STAFF]} />
        <DateField label="Ngày" value={date} hint={closed(date) ? 'Ngày đã chốt: chỉ xem, không sửa.' : undefined} onChange={setDate} />
        <Select label="Ca" value={shift} onChange={setShift} options={['Tất cả', ...SHIFTS]} />
      </div>
      <Panel title="Bản ghi chấm công" right={<Button variant="secondary" onClick={() => setEditing('new')}>+ Thêm bản ghi chấm công</Button>}>
        <Table
          rows={rows}
          rowKey={(r) => r.id}
          empty="Không có bản ghi chấm công."
          cols={[
            { head: 'Nhân viên', cell: (r) => r.staff },
            { head: 'Ca', cell: (r) => r.shift },
            { head: 'Giờ vào', cell: (r) => r.in },
            { head: 'Giờ ra', cell: (r) => r.out ?? '(chưa chấm ra)' },
            { head: 'Thao tác', cell: (r) => <RowMenu actions={[{ label: closed(r.date) ? 'Sửa (ngày đã chốt)' : 'Sửa', onClick: () => tryEdit(r) }]} /> },
          ]}
        />
      </Panel>

      {editing && (
        <RecordForm
          record={editing === 'new' ? null : editing}
          defaultDate={date}
          onClose={() => setEditing(null)}
          onSave={(r) => {
            setRecords((xs) => (xs.some((x) => x.id === r.id) ? xs.map((x) => (x.id === r.id ? r : x)) : [...xs, r]))
            toast({ type: 'success', title: editing === 'new' ? 'Đã thêm bản ghi chấm công' : 'Đã lưu chỉnh sửa chấm công', message: `${r.staff} · ${r.shift}` })
            setEditing(null)
          }}
        />
      )}
    </OwnerLayout>
  )
}

function RecordForm({ record, defaultDate, onClose, onSave }: { record: Record_ | null; defaultDate: string; onClose: () => void; onSave: (r: Record_) => void }) {
  const { toast } = useStore()
  const [staff, setStaff] = useState(record?.staff ?? '')
  const [date, setDate] = useState(record?.date ?? defaultDate)
  const [shift, setShift] = useState(record?.shift ?? 'Ca sáng')
  const [tin, setIn] = useState(record?.in ?? '06:58')
  const [tout, setOut] = useState(record?.out ?? '')

  const save = () => {
    const err = !staff ? 'Chọn nhân viên.' : CLOSED_DAYS.includes(date) ? 'Ngày đã chốt, không thể thêm hoặc sửa.' : tout && tout <= tin ? 'Giờ ra trước giờ vào hoặc ngày đã chốt.' : ''
    if (err) return toast({ type: 'error', title: record ? 'Không thể sửa chấm công' : 'Không thể lưu chấm công', message: err })
    onSave({ id: record?.id ?? String(Date.now()), staff, date, shift, in: tin, out: tout || undefined })
  }

  return (
    <Modal title={record ? 'Sửa bản ghi chấm công' : 'Thêm bản ghi chấm công'} onClose={onClose}>
      <Select label="Nhân viên" value={staff} placeholder="Chọn nhân viên" onChange={setStaff} options={STAFF} disabled={!!record} />
      <div className="flex gap-3">
        <DateField label="Ngày" value={date} onChange={setDate} />
        <Select label="Ca" value={shift} onChange={setShift} options={SHIFTS} />
      </div>
      <div className="flex gap-3">
        <TextField label="Giờ vào" type="time" value={tin} onChange={(e) => setIn(e.target.value)} />
        <TextField label="Giờ ra" type="time" value={tout} onChange={(e) => setOut(e.target.value)} />
      </div>
      <div className="flex gap-2 [&>*]:flex-1">
        <Button variant="destructive-text" onClick={onClose}>
          Hủy
        </Button>
        <Button onClick={save}>{record ? 'Lưu thay đổi' : 'Lưu bản ghi'}</Button>
      </div>
    </Modal>
  )
}
