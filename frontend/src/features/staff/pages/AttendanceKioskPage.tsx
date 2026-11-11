import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { LogIn, LogOut } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SelectField } from '@/components/ui/Field'
import { authApi } from '@/features/auth/api/authApi'
import { AuthShell, RoleTiles, type StaffRole } from '@/features/auth/components/AuthShell'
import { PinPad } from '@/features/auth/components/PinPad'
import { toApiError } from '@/lib/http'
import { staffApi } from '../api/staffApi'

type Kind = 'in' | 'out'

const TABS: { kind: Kind; label: string; icon: typeof LogIn }[] = [
  { kind: 'in', label: 'Chấm công vào', icon: LogIn },
  { kind: 'out', label: 'Chấm công ra', icon: LogOut },
]

/** UC-28: chấm công vào/ra bằng PIN trên máy tại quầy, không cần đăng nhập và không mở/đóng phiên ca thu ngân (ASM-17). */
export default function AttendanceKioskPage() {
  const staff = useQuery({ queryKey: ['auth', 'staff'], queryFn: authApi.staff })
  const [kind, setKind] = useState<Kind>('in')
  const [role, setRole] = useState<StaffRole | null>(null)
  const [accountId, setAccountId] = useState('')
  const [shift, setShift] = useState('MORNING')
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const act = async () => {
    setMessage(null)
    if (!role) return setMessage({ ok: false, text: 'Chọn vai trò trước khi nhập PIN.' })
    if (!accountId) return setMessage({ ok: false, text: 'Vui lòng chọn tên của bạn.' })
    if (!/^\d{6}$/.test(pin)) return setMessage({ ok: false, text: 'Mã PIN gồm đúng 6 chữ số.' })
    setBusy(true)
    try {
      const r =
        kind === 'in'
          ? await staffApi.checkIn(Number(accountId), pin, shift, role)
          : await staffApi.checkOut(Number(accountId), pin, role)
      setMessage({
        ok: true,
        text: `${r.fullName}: đã chấm công ${kind === 'in' ? 'vào' : 'ra'} thành công.`,
      })
    } catch (e) {
      const err = toApiError(e)
      setMessage({
        ok: false,
        text: err.attemptsLeft ? `${err.message} Còn ${err.attemptsLeft} lần thử.` : err.message,
      })
    } finally {
      setPin('')
      setBusy(false)
    }
  }

  return (
    <AuthShell compact>
      <div
        role="tablist"
        aria-label="Chấm công vào hoặc ra"
        className="relative grid w-full max-w-[400px] grid-cols-2 border-b-2 border-brass/40"
      >
        {TABS.map((t) => (
          <button
            key={t.kind}
            role="tab"
            type="button"
            aria-selected={kind === t.kind}
            onClick={() => {
              setKind(t.kind)
              setMessage(null)
            }}
            className={clsx(
              '-mb-0.5 flex min-h-11 items-center justify-center gap-2 border-b-[3px] font-semibold transition',
              kind === t.kind
                ? 'border-brass-dark text-coffee-900'
                : 'border-transparent text-ink-soft hover:border-brass/60 hover:text-coffee-900',
            )}
          >
            <t.icon size={18} aria-hidden />
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative w-full max-w-[400px]">
        <h1 className="sr-only">{kind === 'in' ? 'Chấm công vào ca' : 'Chấm công ra ca'}</h1>
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-center text-xs font-bold uppercase">Chọn vai trò</p>
            <RoleTiles
              value={role}
              onChange={(r) => {
                setRole(r)
                setAccountId('')
                setMessage(null)
              }}
            />
            {staff.isError && (
              <p role="alert" className="mt-2 text-sm text-danger">
                {toApiError(staff.error).message}
              </p>
            )}
          </div>
          <SelectField
            label="Tên nhân viên"
            value={accountId}
            disabled={!role}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <option value="">{role ? '— Chọn tên của bạn —' : '— Chọn vai trò trước —'}</option>
            {(staff.data ?? [])
              .filter((a) => !a.station && a.role === role)
              .map((a) => (
                <option key={a.id} value={a.id} disabled={a.locked}>
                  {a.fullName}
                  {a.locked ? ' (đang khóa)' : ''}
                </option>
              ))}
          </SelectField>
          {kind === 'in' && (
            <SelectField
              label="Ca làm việc"
              value={shift}
              onChange={(e) => setShift(e.target.value)}
            >
              <option value="MORNING">Ca sáng (07:00 – 14:30)</option>
              <option value="EVENING">Ca tối (14:30 – 22:00)</option>
            </SelectField>
          )}
          <div>
            <p className="mb-2 text-center text-xs font-bold uppercase">Nhập PIN</p>
            <PinPad value={pin} onChange={setPin} onSubmit={() => void act()} disabled={busy} />
          </div>
          {message && (
            <p
              role={message.ok ? 'status' : 'alert'}
              className={clsx('text-center text-sm', message.ok ? 'text-success' : 'text-danger')}
            >
              {message.text}
            </p>
          )}
        </div>
      </div>

      <Link to="/login" className="relative text-sm font-semibold text-coffee-700 underline">
        Về trang đăng nhập
      </Link>
    </AuthShell>
  )
}
