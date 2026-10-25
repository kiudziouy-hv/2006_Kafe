import { useState } from 'react'
import { RowMenu, SearchBox, Table } from '../../components/Table'
import { Badge, Button, Chip, ConfirmDialog, DialogOverlay, Modal, Select, TextField } from '../../components/ui'
import { useStore } from '../../store'
import { usePersist } from '../../usePersist'
import OwnerLayout from './OwnerLayout'

type Status = 'active' | 'temp-locked' | 'locked'
type Member = { id: string; name: string; role: string; phone: string; email: string; status: Status; lockMinutes?: number }

const ROLES = ['Phục vụ', 'Thu ngân', 'Pha chế']
const INITIAL: Member[] = [
  { id: 'A', name: 'Nhân viên mẫu A', role: 'Phục vụ', phone: '0912345678', email: 'a@vidu.vn', status: 'active' },
  { id: 'B', name: 'Nhân viên mẫu B', role: 'Thu ngân', phone: '0912345679', email: 'b@vidu.vn', status: 'temp-locked', lockMinutes: 9 },
  ...['C', 'D', 'E', 'F', 'G', 'H', 'I'].map((c) => ({ id: c, name: `Nhân viên mẫu ${c}`, role: 'Pha chế', phone: '0912345680', email: `${c.toLowerCase()}@vidu.vn`, status: 'locked' as Status })),
]
const STATUS_BADGE = (m: Member) =>
  m.status === 'active' ? <Badge label="Hoạt động" tone="success" /> : m.status === 'temp-locked' ? <Badge label={`Khóa tạm (còn ${m.lockMinutes} phút)`} tone="warning" /> : <Badge label="Bị khóa (nghỉ việc)" tone="error" />

// S40 — Danh sách nhân viên; S40b/c — menu ⋯; S41 — Thêm; S41c — Sửa
export default function Staff() {
  const { toast } = useStore()
  const [list, setList] = usePersist('staff', INITIAL)
  const [filter, setFilter] = useState<'all' | Status>('all')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Member | 'new' | null>(null)
  const [confirm, setConfirm] = useState<{ m: Member; action: 'lock' | 'unlock' | 'reset' } | null>(null)

  const rows = list.filter((m) => (filter === 'all' || m.status === filter) && (!q || m.name.toLowerCase().includes(q.toLowerCase())))
  const patch = (m: Member, p: Partial<Member>) => setList((xs) => xs.map((x) => (x.id === m.id ? { ...x, ...p } : x)))

  const doAction = () => {
    if (!confirm) return
    const { m, action } = confirm
    if (action === 'lock') {
      patch(m, { status: 'locked' })
      toast({ type: 'success', title: 'Đã khóa tài khoản', message: m.name })
    } else if (action === 'unlock') {
      patch(m, { status: 'active', lockMinutes: undefined })
      toast({ type: 'success', title: m.status === 'temp-locked' ? 'Đã mở khóa sớm' : 'Đã mở khóa tài khoản', message: m.name })
    } else {
      toast({ type: 'success', title: 'Đã đặt lại mã PIN', message: `${m.name} · PIN tạm: 000000 (đổi ở lần đăng nhập sau).` })
    }
    setConfirm(null)
  }

  const actionText = {
    lock: { title: 'Khóa tài khoản?', msg: 'Nhân viên nghỉ việc sẽ không đăng nhập được. Lịch sử giao dịch vẫn được giữ.', btn: 'Khóa' },
    unlock: { title: 'Mở khóa tài khoản?', msg: 'Nhân viên đăng nhập lại được ngay.', btn: 'Mở khóa' },
    reset: { title: 'Đặt lại mã PIN?', msg: 'Mã PIN hiện tại sẽ bị thay bằng PIN tạm.', btn: 'Đặt lại PIN' },
  }

  return (
    <OwnerLayout title="Nhân viên và tài khoản">
      <div className="flex flex-wrap items-center gap-2">
        <Chip label="Tất cả" selected={filter === 'all'} onClick={() => setFilter('all')} />
        <Chip label="Hoạt động" selected={filter === 'active'} onClick={() => setFilter('active')} />
        <Chip label="Khóa tạm" selected={filter === 'temp-locked'} onClick={() => setFilter('temp-locked')} />
        <Chip label="Bị khóa" selected={filter === 'locked'} onClick={() => setFilter('locked')} />
        <div className="w-[194px]">
          <SearchBox value={q} onChange={setQ} />
        </div>
        <div className="ml-auto">
          <Button onClick={() => setEditing('new')}>+ Thêm nhân viên</Button>
        </div>
      </div>
      <Table
        rows={rows}
        rowKey={(r) => r.id}
        empty={q ? `Không tìm thấy nhân viên khớp «${q}».` : 'Không có nhân viên.'}
        cols={[
          { head: 'Họ tên', cell: (r) => r.name },
          { head: 'Vai trò', cell: (r) => r.role },
          { head: 'Số điện thoại', cell: (r) => r.phone },
          { head: 'Trạng thái tài khoản', cell: STATUS_BADGE },
          {
            head: 'Thao tác',
            cell: (r) => (
              <RowMenu
                actions={
                  r.status === 'active'
                    ? [
                        { label: 'Sửa', onClick: () => setEditing(r) },
                        { label: 'Khóa', onClick: () => setConfirm({ m: r, action: 'lock' }) },
                        { label: 'Đặt lại PIN', onClick: () => setConfirm({ m: r, action: 'reset' }) },
                        { label: 'Mở khóa sớm', disabled: true, onClick: () => {} },
                      ]
                    : [
                        { label: 'Sửa', onClick: () => setEditing(r) },
                        { label: r.status === 'temp-locked' ? 'Mở khóa sớm' : 'Mở khóa', onClick: () => setConfirm({ m: r, action: 'unlock' }) },
                        { label: 'Đặt lại PIN', onClick: () => setConfirm({ m: r, action: 'reset' }) },
                      ]
                }
              />
            ),
          },
        ]}
      />

      {editing && (
        <StaffForm
          member={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(m) => {
            setList((xs) => (xs.some((x) => x.id === m.id) ? xs.map((x) => (x.id === m.id ? m : x)) : [...xs, m]))
            toast({ type: 'success', title: editing === 'new' ? 'Đã lưu nhân viên' : 'Đã cập nhật nhân viên', message: m.name })
            setEditing(null)
          }}
        />
      )}
      {confirm && (
        <DialogOverlay onClose={() => setConfirm(null)}>
          <ConfirmDialog title={actionText[confirm.action].title} message={`${confirm.m.name}. ${actionText[confirm.action].msg}`}>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Không
            </Button>
            <Button variant={confirm.action === 'lock' ? 'destructive' : 'primary'} onClick={doAction}>
              {actionText[confirm.action].btn}
            </Button>
          </ConfirmDialog>
        </DialogOverlay>
      )}
    </OwnerLayout>
  )
}

function StaffForm({ member, onClose, onSave }: { member: Member | null; onClose: () => void; onSave: (m: Member) => void }) {
  const { toast } = useStore()
  const [f, setF] = useState({ name: member?.name ?? '', phone: member?.phone ?? '', email: member?.email ?? '', role: member?.role ?? '', pin: '' })
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v })

  const save = () => {
    const bad = !f.name.trim() || !/^0\d{9}$/.test(f.phone) || !f.role || (!member && !/^\d{6}$/.test(f.pin))
    if (bad) return toast({ type: 'error', title: 'Không thể lưu nhân viên', message: 'Thiếu thông tin, vai trò hoặc PIN chưa đủ 6 số.' })
    onSave({ id: member?.id ?? String(Date.now()), name: f.name.trim(), phone: f.phone, email: f.email, role: f.role, status: member?.status ?? 'active', lockMinutes: member?.lockMinutes })
  }

  return (
    <Modal title={member ? 'Sửa nhân viên' : 'Thêm nhân viên'} onClose={onClose}>
      <h3 className="text-base font-semibold">Thông tin nhân viên</h3>
      <TextField label="Họ tên" placeholder="Nhập nội dung..." value={f.name} onChange={(e) => set('name')(e.target.value)} />
      <TextField label="Số điện thoại" placeholder="09xxxxxxxx" value={f.phone} onChange={(e) => set('phone')(e.target.value)} />
      <TextField label="Email" placeholder="mau@vidu.vn" value={f.email} onChange={(e) => set('email')(e.target.value)} />
      <h3 className="pt-2 text-base font-semibold">Tài khoản</h3>
      <Select label="Vai trò" value={f.role} placeholder="Chọn: Thu ngân / Phục vụ / Pha chế" onChange={set('role')} options={ROLES} />
      {!member && <TextField label="Mã PIN ban đầu (6 số)" type="password" inputMode="numeric" maxLength={6} placeholder="••••••" value={f.pin} onChange={(e) => set('pin')(e.target.value.replace(/\D/g, ''))} />}
      <TextField label="Trạng thái" value={member ? { active: 'Hoạt động', 'temp-locked': 'Khóa tạm', locked: 'Bị khóa' }[member.status] : 'Hoạt động'} disabled readOnly />
      <div className="flex gap-2 pt-2 [&>*]:flex-1">
        <Button variant="destructive-text" onClick={onClose}>
          Hủy
        </Button>
        <Button onClick={save}>Lưu</Button>
      </div>
    </Modal>
  )
}
