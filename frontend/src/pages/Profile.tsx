import { useCallback, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader, Avatar, Button, TextField } from '../components/ui'
import Toast, { type ToastData } from '../components/Toast'
import { MOCK_PROFILE } from '../mock'

// S03 / S03d — Hồ sơ cá nhân
export default function Profile() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: MOCK_PROFILE.name, phone: MOCK_PROFILE.phone, email: MOCK_PROFILE.email })
  const [pin, setPin] = useState({ current: '', next: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<ToastData | null>(null)
  const closeToast = useCallback(() => setToast(null), [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Vui lòng nhập họ tên.'
    if (!/^0\d{9}$/.test(form.phone)) errs.phone = 'Số điện thoại gồm 10 số, bắt đầu bằng 0.'
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Email không hợp lệ.'
    if (pin.current || pin.next || pin.confirm) {
      if (pin.current !== MOCK_PROFILE.pin) errs.current = 'Mã PIN hiện tại không đúng.'
      if (!/^\d{6}$/.test(pin.next)) errs.next = 'Mã PIN mới gồm 6 chữ số.'
      else if (pin.confirm !== pin.next) errs.confirm = 'Mã PIN nhập lại không khớp.'
    }
    setErrors(errs)
    if (Object.keys(errs).length) {
      setToast({ type: 'error', title: 'Không thể lưu', message: 'Kiểm tra lại các ô đang báo lỗi.' })
    } else {
      setPin({ current: '', next: '', confirm: '' })
      setToast({ type: 'success', title: 'Đã lưu thông tin cá nhân' })
    }
  }

  const pinField = (key: keyof typeof pin, label: string) => (
    <TextField
      label={label}
      type="password"
      inputMode="numeric"
      maxLength={6}
      placeholder="••••••"
      value={pin[key]}
      error={errors[key]}
      onChange={(e) => setPin({ ...pin, [key]: e.target.value.replace(/\D/g, '') })}
    />
  )

  return (
    <div className="min-h-screen bg-bg-canvas p-3 lg:flex lg:items-center lg:justify-center lg:p-6">
      <Toast toast={toast} onClose={closeToast} />
      {/* Điện thoại: S03 (header + form 1 cột). Máy tính: S03d (thẻ giữa màn hình, 2 cột) */}
      <div className="mx-auto flex max-w-[720px] animate-page-in flex-col gap-3 lg:mx-0 lg:w-[640px] lg:max-w-none">
        <div className="lg:hidden">
          <AppHeader title="Hồ sơ cá nhân" back />
        </div>

        <form
          onSubmit={submit}
          className="grid gap-3 p-4 lg:grid-cols-2 lg:gap-x-8 lg:rounded-[28px] lg:border lg:border-glass-stroke lg:bg-[#f3ecdd] lg:px-10 lg:py-9 lg:shadow-[0_20px_48px_-8px_rgba(47,24,5,0.28)]"
        >
          <h1 className="hidden text-xl leading-7 font-semibold lg:col-span-2 lg:block">Hồ sơ cá nhân</h1>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Avatar initials={MOCK_PROFILE.initials} />
              <div>
                <p className="text-base font-semibold">{form.name || MOCK_PROFILE.name}</p>
                <p className="text-xs text-text-secondary">{MOCK_PROFILE.role} · Tài khoản đang hoạt động</p>
              </div>
            </div>
            <TextField label="Họ tên" value={form.name} error={errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="Số điện thoại" type="tel" value={form.phone} error={errors.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <TextField label="Email" type="email" value={form.email} error={errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-base font-semibold lg:flex lg:h-12 lg:items-center">Đổi mật khẩu / mã PIN</h2>
            {pinField('current', 'Mã PIN hiện tại')}
            {pinField('next', 'Mã PIN mới (6 số)')}
            {pinField('confirm', 'Nhập lại mã PIN mới')}
            <div className="flex gap-2 max-lg:[&>*]:flex-1 lg:justify-end lg:pt-1">
              <Button type="button" variant="destructive-text" className="lg:w-[94px]" onClick={() => navigate(-1)}>
                Hủy
              </Button>
              <Button type="submit">Lưu thay đổi</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
