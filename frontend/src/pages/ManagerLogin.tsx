import { useCallback, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import LoginLayout, { LoginTitle } from '../components/LoginLayout'
import Toast, { type ToastData } from '../components/Toast'
import { MOCK_MANAGER } from '../mock'
import iconUser from '../assets/icons/user-input.svg'
import iconLock from '../assets/icons/lock-input.svg'

// S02 / S02m — Đăng nhập Quản lý
export default function ManagerLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [toast, setToast] = useState<ToastData | null>(null)
  const closeToast = useCallback(() => setToast(null), [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (username === MOCK_MANAGER.username && password === MOCK_MANAGER.password) {
      setToast({ type: 'success', title: 'Đăng nhập thành công' })
      setTimeout(() => navigate('/quan-ly/bao-cao'), 600)
    } else {
      setToast({ type: 'error', title: 'Sai thông tin đăng nhập', message: 'Kiểm tra lại tên đăng nhập và mật khẩu.' })
    }
  }

  return (
    <LoginLayout>
      <Toast toast={toast} onClose={closeToast} />
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <LoginTitle>ĐĂNG NHẬP QUẢN LÝ</LoginTitle>
        <Field icon={iconUser} placeholder="Tên đăng nhập..." value={username} onChange={setUsername} autoComplete="username" />
        <Field icon={iconLock} placeholder="Mật khẩu..." value={password} onChange={setPassword} type="password" autoComplete="current-password" />
        <button
          type="submit"
          className="h-14 rounded-[20px] border-[1.5px] border-brown-stroke bg-gradient-to-r from-brown-from to-brown-to px-4 text-[19px] font-semibold text-on-brown drop-shadow-[0_8px_8px_rgba(59,28,12,0.35)] transition hover:brightness-110 active:scale-[0.99]"
        >
          Đăng nhập
        </button>
      </form>
    </LoginLayout>
  )
}

type FieldProps = {
  icon: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  type?: string
  autoComplete?: string
}

function Field({ icon, placeholder, value, onChange, type = 'text', autoComplete }: FieldProps) {
  return (
    <label className="flex h-[58px] items-center gap-3 rounded-[26px] border-2 border-cream-stroke bg-cream-field px-5 focus-within:border-gold-tab">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="min-w-0 flex-1 bg-transparent text-[17px] text-ink outline-none placeholder:text-ink-placeholder"
      />
      <img src={icon} alt="" className="size-[22px]" />
    </label>
  )
}
