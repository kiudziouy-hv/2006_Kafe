import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { QueryState } from '@/components/feedback/QueryState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TextField } from '@/components/ui/Field'
import { initials } from '@/components/layout/UserMenu'
import { HOME_BY_ROLE, useAuth } from '@/features/auth'
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
  const { user } = useAuth()
  const [fullName, setFullName] = useState(member.fullName)
  const [phone, setPhone] = useState(member.phone ?? '')
  const [email, setEmail] = useState(member.email ?? '')
  const save = useAction(() => staffApi.updateMe({ fullName, phone, email }), {
    invalidate: [['staff']],
    success: 'Đã cập nhật thông tin cá nhân',
  })
  const changed =
    fullName !== member.fullName || phone !== (member.phone ?? '') || email !== (member.email ?? '')
  return (
    <section aria-label="Thông tin cá nhân" className="mx-auto w-full max-w-4xl">
      {user && (
        <Link
          to={HOME_BY_ROLE[user.role]}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition hover:text-ink"
        >
          <ArrowLeft size={16} aria-hidden />
          Quay lại
        </Link>
      )}
      <h1 className="mb-5 text-[1.65rem] font-semibold leading-tight">Thông tin cá nhân</h1>
      <div className="grid gap-4 md:grid-cols-[17rem_1fr]">
        <Card className="flex flex-col items-center justify-center gap-3 py-8 text-center">
          <span className="grid h-24 w-24 place-items-center rounded-full border-2 border-brass/50 bg-coffee-100 text-3xl font-bold text-coffee-900">
            {initials(fullName || member.fullName)}
          </span>
          <div className="min-w-0 max-w-full">
            <p className="truncate text-lg font-bold">{member.fullName}</p>
            <p className="mt-0.5 text-sm text-ink-soft">@{member.username}</p>
          </div>
          <Badge tone="neutral">{ROLE_NAME[member.role]}</Badge>
        </Card>
        <Card className="sm:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TextField
                label="Họ tên"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
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
          </div>
          <div className="mt-6 flex justify-end">
            <Button
              className="w-full sm:w-auto sm:min-w-44"
              disabled={!fullName.trim() || !changed}
              loading={save.isPending}
              onClick={() => save.mutate(undefined)}
            >
              Lưu thay đổi
            </Button>
          </div>
        </Card>
      </div>
    </section>
  )
}
