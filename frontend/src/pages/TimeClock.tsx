import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import Toast, { type ToastData } from '../components/Toast'
import { MOCK_SHIFTS, MOCK_STAFF } from '../mock'
import iconChevron from '../assets/icons/chevron-down.svg'

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Xóa', '0', 'OK']

// S05 — Chấm công vào/ra
export default function TimeClock() {
  const [staffId, setStaffId] = useState(MOCK_STAFF[0].id)
  const [shift, setShift] = useState(MOCK_SHIFTS[0])
  const [pin, setPin] = useState('')
  const [clockedIn, setClockedIn] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<ToastData | null>(null)
  const closeToast = useCallback(() => setToast(null), [])

  const staff = MOCK_STAFF.find((s) => s.id === staffId)!

  const press = (k: string) => {
    if (k === 'Xóa') setPin((p) => p.slice(0, -1))
    else if (k !== 'OK' && pin.length < 6) setPin((p) => p + k)
  }

  const clock = (dir: 'in' | 'out') => {
    if (pin !== staff.pin) {
      setToast({ type: 'error', title: 'Mã PIN không đúng', message: 'Nhập lại mã PIN 6 số của bạn.' })
    } else if (dir === 'out' && !clockedIn[staffId]) {
      setToast({ type: 'error', title: 'Chưa chấm công vào', message: `${staff.name} chưa chấm công vào ca hôm nay.` })
    } else if (dir === 'in' && clockedIn[staffId]) {
      setToast({ type: 'error', title: 'Chưa chấm công ra', message: 'Hãy chấm công ra ca trước rồi mới vào ca mới.' })
    } else {
      setClockedIn({ ...clockedIn, [staffId]: dir === 'in' })
      const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      setToast({ type: 'success', title: 'Đã ghi nhận chấm công', message: `${staff.name} · ${dir === 'in' ? 'Vào ca' : 'Ra ca'} lúc ${time}` })
    }
    setPin('')
  }

  return (
    <div className="flex min-h-screen items-start justify-center px-4 py-8 lg:py-[72px]">
      <Toast toast={toast} onClose={closeToast} />
      <div className="flex w-full max-w-[480px] animate-page-in flex-col gap-3 rounded-[30px] border-2 border-[#e2c98f] bg-[linear-gradient(126deg,#fff8e4_0%,#f7e9c8_71%)] px-5 py-6 shadow-[0_22px_44px_-8px_rgba(90,58,20,0.25)] sm:px-[30px] sm:py-[26px]">
        <h1 className="text-center text-[30px] font-semibold text-ink">CHẤM CÔNG</h1>
        <span className="h-[3px] w-[300px] max-w-full rounded-[2px] bg-gradient-to-r from-gold-line to-gold-line/0" />

        <Select label="Nhân viên" value={staffId} onChange={setStaffId} options={MOCK_STAFF.map((s) => ({ value: s.id, label: s.name }))} />
        <Select label="Ca làm việc (khi chấm công vào)" value={shift} onChange={setShift} options={MOCK_SHIFTS.map((s) => ({ value: s, label: s }))} />

        <div className="flex justify-center gap-2 sm:gap-2.5">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex h-[42px] w-11 items-center justify-center rounded-2xl border-[1.5px] border-[#d9b97a] bg-[#fff8e6]/80 sm:w-[50px]">
              {i < pin.length && <span className="size-2.5 rounded-full bg-text-primary" />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              className="h-[42px] rounded-2xl border-[1.5px] border-[#d9b97a] bg-gradient-to-b from-[#fff8e6] to-[#f6e6c0] text-[19px] font-semibold text-ink transition active:scale-95"
            >
              {k}
            </button>
          ))}
        </div>

        <div className="flex gap-3.5">
          <button
            type="button"
            onClick={() => clock('in')}
            className="h-[58px] flex-1 rounded-[22px] border-[1.5px] border-brown-stroke bg-gradient-to-r from-brown-from to-brown-to px-4 text-[17px] font-semibold text-on-brown drop-shadow-[0_10px_9px_rgba(59,28,12,0.35)] sm:text-[19px]"
          >
            Chấm công vào
          </button>
          <button
            type="button"
            onClick={() => clock('out')}
            className="h-[58px] flex-1 rounded-[22px] border-[1.5px] border-gold-frame bg-gradient-to-r from-[#fff8e6] to-[#f6e6c0] px-4 text-[17px] font-semibold text-[#3b2012] sm:text-[19px]"
          >
            Chấm công ra
          </button>
        </div>

        <Link to="/dang-nhap" className="text-center text-base font-semibold text-ink-link underline">
          ← Quay lại đăng nhập
        </Link>
      </div>
    </div>
  )
}

type SelectProps = { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }

function Select({ label, value, onChange, options }: SelectProps) {
  return (
    <label className="flex flex-col gap-3">
      <span className="text-[17px] font-semibold text-ink">{label}</span>
      <span className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-[52px] w-full appearance-none rounded-3xl border-[1.5px] border-[#d9b97a] bg-[#fff8e6] pr-12 pl-5 text-[19px] font-semibold text-ink outline-none focus:border-gold-tab"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <img src={iconChevron} alt="" className="pointer-events-none absolute top-1/2 right-[18px] h-[9px] w-4 -translate-y-1/2" />
      </span>
    </label>
  )
}
