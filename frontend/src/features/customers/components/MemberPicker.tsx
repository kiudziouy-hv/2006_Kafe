import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useToast } from '@/components/feedback/Toaster'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { toApiError } from '@/lib/http'
import { customersApi, type Customer } from '../api/customersApi'

/** UC-26 tra cứu thành viên theo số điện thoại; chưa có thì đăng ký ngay (UC-25) rồi quay lại thao tác thanh toán. */
export function MemberPicker({
  member,
  onChange,
}: {
  member: Customer | null
  onChange: (c: Customer | null) => void
}) {
  const { notify } = useToast()
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [notFound, setNotFound] = useState(false)
  const lookup = useMutation({
    mutationFn: () => customersApi.lookup(phone),
    onSuccess: (c) => {
      setNotFound(false)
      onChange(c)
    },
    onError: (e) => {
      const err = toApiError(e)
      if (err.code === 'NO_CUSTOMER') setNotFound(true)
      else notify({ tone: 'danger', title: 'Không tra cứu được', description: err.message })
    },
  })
  const register = useMutation({
    mutationFn: () => customersApi.register({ fullName: name, phone }),
    onSuccess: (c) => {
      notify({ tone: 'success', title: `Đã đăng ký thành viên ${c.fullName}` })
      setNotFound(false)
      onChange(c)
    },
    onError: (e) =>
      notify({ tone: 'danger', title: 'Không đăng ký được', description: toApiError(e).message }),
  })

  if (member) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white/70 px-4 py-2">
        <div>
          <p className="font-semibold">{member.fullName}</p>
          <p className="text-sm text-ink-soft">
            {member.phone} · {member.points} điểm
          </p>
        </div>
        <Button variant="ghost" onClick={() => onChange(null)}>
          Bỏ chọn
        </Button>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <TextField
          label="Số điện thoại thành viên"
          inputMode="numeric"
          maxLength={10}
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value.replace(/\D/g, ''))
            setNotFound(false)
          }}
          className="flex-1"
        />
        <Button
          variant="secondary"
          disabled={phone.length !== 10}
          loading={lookup.isPending}
          onClick={() => lookup.mutate()}
        >
          Tìm
        </Button>
      </div>
      {!notFound && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-ink-soft">
            Khách không phải thành viên hoặc không cho số: bỏ qua, thanh toán bình thường (không tích điểm).
          </p>
          <Button variant="ghost" onClick={() => setNotFound(true)}>
            Đăng ký mới
          </Button>
        </div>
      )}
      {notFound && (
        <div className="flex flex-col gap-2 rounded-2xl bg-warning-bg p-3">
          <p className="text-sm text-warning">
            Nhập số điện thoại và tên để đăng ký thành viên mới, hoặc bỏ qua nếu khách không đăng ký.
          </p>
          <TextField label="Họ tên khách" value={name} onChange={(e) => setName(e.target.value)} />
          <Button
            disabled={!name.trim() || phone.length !== 10}
            loading={register.isPending}
            onClick={() => register.mutate()}
          >
            Đăng ký thành viên
          </Button>
          <Button variant="ghost" onClick={() => setNotFound(false)}>
            Bỏ qua, không đăng ký
          </Button>
        </div>
      )}
    </div>
  )
}
