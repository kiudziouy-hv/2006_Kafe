import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LoginLayout, { LoginTitle } from '../components/LoginLayout'
import PinKeypad from '../components/PinKeypad'
import Toast, { type ToastData } from '../components/Toast'
import { LOCK_SECONDS, MAX_PIN_ATTEMPTS, MOCK_STAFF_PIN } from '../mock'
import iconInboxDark from '../assets/icons/inbox-dark.svg'
import iconInboxLight from '../assets/icons/inbox-light.svg'
import iconCupDark from '../assets/icons/cup-dark.svg'
import iconCupLight from '../assets/icons/cup-light.svg'
import iconBanknoteDark from '../assets/icons/banknote-dark.svg'
import iconBanknoteLight from '../assets/icons/banknote-light.svg'

type Role = 'phuc-vu' | 'pha-che' | 'thu-ngan'

const roles: { id: Role; label: string; icon: string; iconActive: string }[] = [
  { id: 'phuc-vu', label: 'PHỤC VỤ', icon: iconInboxDark, iconActive: iconInboxLight },
  { id: 'pha-che', label: 'PHA CHẾ', icon: iconCupDark, iconActive: iconCupLight },
  { id: 'thu-ngan', label: 'THU NGÂN', icon: iconBanknoteDark, iconActive: iconBanknoteLight },
]

const HOME: Record<Role, string> = { 'phuc-vu': '/phuc-vu', 'pha-che': '/pha-che', 'thu-ngan': '/thu-ngan' }

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// S01 / S01a–g / S01-lock — Đăng nhập Nhân viên
export default function StaffLogin() {
  const navigate = useNavigate()
  const [role, setRole] = useState<Role | null>(null)
  const [pin, setPin] = useState('')
  const [failed, setFailed] = useState(0)
  const [lockLeft, setLockLeft] = useState(0)
  const [toast, setToast] = useState<ToastData | null>(null)
  const closeToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    if (lockLeft <= 0) return
    const t = setTimeout(() => setLockLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [lockLeft])

  const submit = () => {
    if (!role) return setToast({ type: 'error', title: 'Chưa chọn vai trò', message: 'Chọn vai trò trước khi nhập PIN.' })
    if (pin.length < 6) return setToast({ type: 'error', title: 'Mã PIN chưa đủ', message: 'Mã PIN gồm 6 chữ số.' })

    if (pin === MOCK_STAFF_PIN[role]) {
      setFailed(0)
      setToast({ type: 'success', title: 'Đăng nhập thành công' })
      setTimeout(() => navigate(HOME[role]), 600)
    } else {
      const n = failed + 1
      if (n >= MAX_PIN_ATTEMPTS) {
        setFailed(0)
        setLockLeft(LOCK_SECONDS)
        setToast({ type: 'error', title: 'Tài khoản tạm khóa 15 phút', message: 'Nhập sai PIN 5 lần liên tiếp.' })
      } else {
        setFailed(n)
        setToast({ type: 'error', title: 'Mã PIN không đúng', message: `Còn ${MAX_PIN_ATTEMPTS - n} lần thử.` })
      }
    }
    setPin('')
  }

  const locked = lockLeft > 0

  return (
    <LoginLayout>
      <Toast toast={toast} onClose={closeToast} />
      <div className="flex flex-col gap-2.5">
        <LoginTitle>ĐĂNG NHẬP NHÂN VIÊN</LoginTitle>

        <Label>CHỌN VAI TRÒ</Label>
        <div className="flex gap-2.5 lg:gap-3">
          {roles.map((r) => {
            const active = role === r.id
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={`flex h-16 flex-1 flex-col items-center gap-1.5 rounded-[20px] border-2 px-1.5 py-2.5 text-[13px] leading-4 font-semibold transition lg:h-[70px] lg:rounded-[22px] lg:p-3.5 lg:text-[15px] lg:leading-5 ${
                  active
                    ? 'border-brown-stroke bg-gradient-to-r from-brown-from to-brown-to text-on-brown'
                    : 'border-cream-stroke bg-cream-field text-ink'
                }`}
              >
                <img src={active ? r.iconActive : r.icon} alt="" className="size-7 lg:size-6" />
                {r.label}
              </button>
            )
          })}
        </div>

        <Label>{locked ? `ĐÃ NHẬP SAI 5 LẦN · TẠM KHÓA ${formatTime(lockLeft)}` : 'NHẬP PIN'}</Label>
        <PinKeypad value={pin} onChange={setPin} onSubmit={submit} disabled={locked} />

        <Link to="/cham-cong" className="hidden text-center text-[17px] font-semibold text-ink-link underline lg:block">
          Chấm công vào / ra ca
        </Link>
      </div>
    </LoginLayout>
  )
}

function Label({ children }: { children: string }) {
  return <p className="text-center text-xs leading-4 font-semibold tracking-[1.44px] text-ink-label lg:text-[13px] lg:tracking-[1.56px]">{children}</p>
}
