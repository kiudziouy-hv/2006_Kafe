import { TabAction } from '@/components/ui/Tabs'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { QueryState } from '@/components/feedback/QueryState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { SelectField, TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useAction } from '@/hooks/useAction'
import { useAuth } from '@/features/auth'
import { ACCOUNT_STATUS, ROLE_NAME, staffApi, type StaffMember } from '../api/staffApi'

const KEY = [['staff']]
const TONE = { ACTIVE: 'success', TEMP_LOCKED: 'warning', LOCKED: 'danger' } as const

/** UC-04: thêm nhân viên, gán vai trò, đặt lại PIN/mật khẩu, khóa tài khoản khi nghỉ việc (không xóa, BR-042). */
export function StaffTab() {
  const { user } = useAuth()
  const list = useQuery({ queryKey: ['staff', 'list'], queryFn: staffApi.list })
  const [editing, setEditing] = useState<StaffMember | 'new' | null>(null)
  const [resetting, setResetting] = useState<StaffMember | null>(null)
  const lock = useAction(
    (v: { id: number; locked: boolean }) => staffApi.setLocked(v.id, v.locked),
    {
      invalidate: KEY,
      success: (m) => (m.status === 'LOCKED' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản'),
    },
  )
  return (
    <QueryState isPending={list.isPending} error={list.error} onRetry={() => void list.refetch()}>
      <TabAction>
        <Button onClick={() => setEditing('new')}>Thêm nhân viên</Button>
      </TabAction>
      <DataTable
        rows={list.data ?? []}
        rowKey={(s) => s.id}
        columns={[
          {
            header: 'Họ tên',
            cell: (s) => (
              <span className="inline-flex items-center gap-2">
                <span className="font-semibold">{s.fullName}</span>
                {s.station && <Badge>Dùng chung</Badge>}
              </span>
            ),
          },
          { header: 'Vai trò', cell: (s) => ROLE_NAME[s.role] },
          { header: 'Điện thoại', cell: (s) => s.phone ?? '—' },
          { header: 'Email', cell: (s) => s.email ?? '—' },
          {
            header: 'Tài khoản',
            cell: (s) => <Badge tone={TONE[s.status]}>{ACCOUNT_STATUS[s.status]}</Badge>,
          },
          {
            header: '',
            cell: (s) => (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setEditing(s)}>
                  Sửa
                </Button>
                <Button variant="secondary" onClick={() => setResetting(s)}>
                  Đặt lại {s.role === 'OWNER_MANAGER' ? 'mật khẩu' : 'PIN'}
                </Button>
                {s.accountId !== user?.id && (
                  <Button
                    variant="secondary"
                    className={
                      s.status === 'LOCKED' ? undefined : '!text-danger hover:!border-danger'
                    }
                    loading={lock.isPending}
                    onClick={() => lock.mutate({ id: s.id, locked: s.status !== 'LOCKED' })}
                  >
                    {s.status === 'LOCKED' ? 'Mở khóa' : 'Khóa'}
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />
      {editing && (
        <StaffForm member={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
      {resetting && <ResetSecret member={resetting} onClose={() => setResetting(null)} />}
    </QueryState>
  )
}

function StaffForm({ member, onClose }: { member: StaffMember | null; onClose: () => void }) {
  const [fullName, setFullName] = useState(member?.fullName ?? '')
  const [phone, setPhone] = useState(member?.phone ?? '')
  const [email, setEmail] = useState(member?.email ?? '')
  const [role, setRole] = useState<'CASHIER' | 'WAITER' | 'BARISTA'>(
    member && member.role !== 'OWNER_MANAGER' ? member.role : 'WAITER',
  )
  const [secret, setSecret] = useState('')
  const isOwner = member?.role === 'OWNER_MANAGER'
  const save = useAction(
    () => {
      const body = { fullName, phone, email, role, secret }
      return member ? staffApi.update(member.id, body) : staffApi.create(body)
    },
    {
      invalidate: KEY,
      success: member ? 'Đã lưu nhân viên' : 'Đã thêm nhân viên',
      onDone: onClose,
    },
  )
  return (
    <Modal title={member ? `Sửa: ${member.fullName}` : 'Thêm nhân viên'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <TextField
          label="Họ tên"
          maxLength={100}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <TextField
          label="Số điện thoại"
          inputMode="numeric"
          maxLength={10}
          hint={
            phone !== '' && phone.length !== 10 ? 'Số điện thoại gồm đúng 10 chữ số.' : undefined
          }
          placeholder="10 chữ số, bắt đầu bằng 0"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {!isOwner && (
          <SelectField
            label="Vai trò"
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
          >
            <option value="WAITER">Phục vụ</option>
            <option value="CASHIER">Thu ngân</option>
            <option value="BARISTA">Pha chế</option>
          </SelectField>
        )}
        {!member && (
          <TextField
            label="Mã PIN ban đầu (6 chữ số)"
            inputMode="numeric"
            maxLength={6}
            value={secret}
            onChange={(e) => setSecret(e.target.value.replace(/\D/g, ''))}
          />
        )}
        <Button
          disabled={!fullName.trim() || (phone !== '' && phone.length !== 10)}
          loading={save.isPending}
          onClick={() => save.mutate(undefined)}
        >
          Lưu
        </Button>
      </div>
    </Modal>
  )
}

function ResetSecret({ member, onClose }: { member: StaffMember; onClose: () => void }) {
  const owner = member.role === 'OWNER_MANAGER'
  const [secret, setSecret] = useState('')
  const save = useAction(() => staffApi.resetSecret(member.id, secret), {
    invalidate: KEY,
    success: owner ? 'Đã đặt lại mật khẩu' : 'Đã đặt lại PIN',
    onDone: onClose,
  })
  return (
    <Modal title={`Đặt lại ${owner ? 'mật khẩu' : 'PIN'}: ${member.fullName}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <TextField
          label={owner ? 'Mật khẩu mới (tối thiểu 8 ký tự)' : 'PIN mới (6 chữ số)'}
          type={owner ? 'password' : 'text'}
          inputMode={owner ? 'text' : 'numeric'}
          maxLength={owner ? 64 : 6}
          value={secret}
          onChange={(e) => setSecret(owner ? e.target.value : e.target.value.replace(/\D/g, ''))}
        />

        <Button
          disabled={owner ? secret.length < 8 : secret.length !== 6}
          loading={save.isPending}
          onClick={() => save.mutate(undefined)}
        >
          Đặt lại
        </Button>
      </div>
    </Modal>
  )
}
