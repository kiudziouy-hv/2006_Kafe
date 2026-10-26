import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { QueryState } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TextField } from '@/components/ui/Field'
import { useAction } from '@/hooks/useAction'
import { ROLE_NAME, staffApi, type StaffMember } from '../api/staffApi'

/** UC-03: mọi vai trò cập nhật họ tên, số điện thoại, email của chính mình. */
export default function ProfilePage() {
  const me = useQuery({ queryKey: ['staff', 'me'], queryFn: staffApi.me })
  return (
    <QueryState isPending={me.isPending} error={me.error} onRetry={() => void me.refetch()}>
      {me.data && <Form member={me.data} />}
    </QueryState>
  )
}

function Form({ member }: { member: StaffMember }) {
  const [fullName, setFullName] = useState(member.fullName)
  const [phone, setPhone] = useState(member.phone ?? '')
  const [email, setEmail] = useState(member.email ?? '')
  const save = useAction(() => staffApi.updateMe({ fullName, phone, email }), {
    invalidate: [['staff']],
    success: 'Đã cập nhật thông tin cá nhân',
  })
  return (
    <Card className="max-w-lg">
      <h1 className="text-xl font-bold">Thông tin cá nhân</h1>
      <p className="mb-4 text-sm text-ink-soft">
        {ROLE_NAME[member.role]} · tài khoản {member.username}
      </p>
      <div className="flex flex-col gap-3">
        <TextField label="Họ tên" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <TextField
          label="Số điện thoại"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button
          disabled={!fullName.trim()}
          loading={save.isPending}
          onClick={() => save.mutate(undefined)}
        >
          Lưu thay đổi
        </Button>
      </div>
    </Card>
  )
}
