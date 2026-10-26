import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Wordmark } from '@/components/shared/Wordmark'
import { Logo } from '@/components/shared/Logo'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SelectField } from '@/components/ui/Field'
import { authApi } from '@/features/auth/api/authApi'
import { PinPad } from '@/features/auth/components/PinPad'
import { toApiError } from '@/lib/http'
import { staffApi } from '../api/staffApi'

/** UC-28: chấm công vào/ra bằng PIN trên máy tại quầy, không cần đăng nhập và không mở/đóng phiên ca thu ngân (ASM-17). */
export default function AttendanceKioskPage() {
  const staff = useQuery({ queryKey: ['auth', 'staff'], queryFn: authApi.staff })
  const [accountId, setAccountId] = useState('')
  const [shift, setShift] = useState('MORNING')
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const act = async (kind: 'in' | 'out') => {
    if (!accountId) return setMessage({ ok: false, text: 'Vui lòng chọn tài khoản của bạn.' })
    if (!/^\d{6}$/.test(pin)) return setMessage({ ok: false, text: 'Mã PIN gồm đúng 6 chữ số.' })
    setBusy(true)
    try {
      const r =
        kind === 'in'
          ? await staffApi.checkIn(Number(accountId), pin, shift)
          : await staffApi.checkOut(Number(accountId), pin)
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
    <main className="flex min-h-full flex-col items-center justify-center gap-4 px-4 py-8">
      <Logo className="h-24 w-24" />
      <Wordmark className="text-4xl" />
      <Card className="w-full max-w-[420px]">
        <h1 className="mb-1 text-center text-lg font-bold uppercase">Chấm công</h1>
        <div className="flex flex-col gap-3">
          <SelectField
            label="Nhân viên"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <option value="">— Chọn tài khoản —</option>
            {(staff.data ?? [])
              .filter((a) => !a.station)
              .map((a) => (
                <option key={a.id} value={a.id} disabled={a.locked}>
                  {a.fullName}
                  {a.locked ? ' (đang khóa)' : ''}
                </option>
              ))}
          </SelectField>
          <SelectField
            label="Ca làm việc (khi chấm công vào)"
            value={shift}
            onChange={(e) => setShift(e.target.value)}
          >
            <option value="MORNING">Ca sáng (07:00 – 14:30)</option>
            <option value="EVENING">Ca tối (14:30 – 22:00)</option>
          </SelectField>
          <PinPad value={pin} onChange={setPin} onSubmit={() => void act('in')} disabled={busy} />
          <div className="grid grid-cols-2 gap-2">
            <Button loading={busy} onClick={() => void act('in')}>
              Chấm công vào
            </Button>
            <Button variant="secondary" loading={busy} onClick={() => void act('out')}>
              Chấm công ra
            </Button>
          </div>
          {message && (
            <p
              role="status"
              className={message.ok ? 'text-center text-success' : 'text-center text-danger'}
            >
              {message.text}
            </p>
          )}
        </div>
      </Card>
      <Link to="/login" className="text-sm text-coffee-700 underline">
        Về trang đăng nhập
      </Link>
    </main>
  )
}
