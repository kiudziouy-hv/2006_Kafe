import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { Lock, User } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { toApiError } from '@/lib/http'
import { authApi } from '../api/authApi'
import { AuthShell, RoleTiles, type StaffRole } from '../components/AuthShell'
import { PinPad } from '../components/PinPad'
import { HOME_BY_ROLE, useAuth } from '../hooks/useAuth'
import { ownerLoginSchema, pinSchema, type OwnerLoginForm } from '../schemas/loginSchemas'

type Mode = 'owner' | 'staff'
/** UC-01: một màn đăng nhập, hai chế độ: Quản lý (tên + mật khẩu) và Nhân viên (chọn vai trò + PIN 6 số). */
export default function LoginPage() {
  const { user, loading } = useAuth()
  const [params] = useSearchParams()
  const [mode, setMode] = useState<Mode>('owner')

  if (!loading && user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />

  return (
    <AuthShell>
      {params.get('expired') && (
        <p role="alert" className="rounded-2xl bg-warning-bg px-4 py-2 text-sm text-warning">
          Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.
        </p>
      )}

      <div
        role="tablist"
        aria-label="Chế độ đăng nhập"
        className="relative grid w-full max-w-[400px] grid-cols-2 border-b-2 border-brass/40"
      >
        {(['owner', 'staff'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={clsx(
              '-mb-0.5 flex min-h-11 items-center justify-center gap-2 border-b-[3px] font-semibold transition',
              mode === m
                ? 'border-brass-dark text-coffee-900'
                : 'border-transparent text-ink-soft hover:border-brass/60 hover:text-coffee-900',
            )}
          >
            <User size={18} aria-hidden />
            {m === 'owner' ? 'Quản lý' : 'Nhân viên'}
          </button>
        ))}
      </div>

      <div className="relative w-full max-w-[400px]">
        <h1 className="sr-only">
          {mode === 'owner' ? 'Đăng nhập quản lý' : 'Đăng nhập nhân viên'}
        </h1>
        {/* Hai form xếp chồng cùng một ô lưới: khung luôn cao bằng form cao nhất nên đổi tab không làm khung nhảy hoặc co lại. */}
        <div className="grid">
          {(['owner', 'staff'] as const).map((m) => (
            <div
              key={m}
              inert={mode !== m}
              aria-hidden={mode !== m}
              className={clsx(
                'col-start-1 row-start-1 flex flex-col justify-center',
                'transition-opacity duration-200',
                mode !== m && 'pointer-events-none opacity-0',
              )}
            >
              {m === 'owner' ? <OwnerForm /> : <StaffForm />}
            </div>
          ))}
        </div>
      </div>

      <Link to="/attendance" className="relative text-sm font-semibold text-coffee-700 underline">
        Chấm công vào / ra ca
      </Link>
    </AuthShell>
  )
}

function OwnerForm() {
  const { loginOwner } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OwnerLoginForm>({ resolver: zodResolver(ownerLoginSchema) })

  const submit = handleSubmit(async (v) => {
    setServerError(null)
    try {
      const u = await loginOwner(v.username, v.password)
      navigate(HOME_BY_ROLE[u.role], { replace: true })
    } catch (e) {
      setServerError(describeAuthError(e))
    }
  })

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <label className="flex flex-col gap-1">
        <span className="sr-only">Tên đăng nhập</span>
        <span className="vt-field flex items-center gap-2 rounded-2xl border-2 border-white/90 bg-white/40 px-4">
          <input
            {...register('username')}
            placeholder="Tên đăng nhập..."
            autoComplete="username"
            className="min-h-14 flex-1 bg-transparent outline-none placeholder:text-ink-soft"
          />
          <User size={18} aria-hidden />
        </span>
        {errors.username && (
          <span role="alert" className="text-sm text-danger">
            {errors.username.message}
          </span>
        )}
      </label>
      <label className="flex flex-col gap-1">
        <span className="sr-only">Mật khẩu</span>
        <span className="vt-field flex items-center gap-2 rounded-2xl border-2 border-white/90 bg-white/40 px-4">
          <input
            {...register('password')}
            type="password"
            placeholder="Mật khẩu..."
            autoComplete="current-password"
            className="min-h-14 flex-1 bg-transparent outline-none placeholder:text-ink-soft"
          />
          <Lock size={18} aria-hidden />
        </span>
        {errors.password && (
          <span role="alert" className="text-sm text-danger">
            {errors.password.message}
          </span>
        )}
      </label>
      {serverError && (
        <p role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      )}
      <Button type="submit" loading={isSubmitting} className="min-h-14">
        Đăng nhập
      </Button>
      <p className="text-center text-xs text-ink-soft">
        Dành cho Chủ quán / Quản lý. Nhân viên chọn tab “Nhân viên”.
      </p>
    </form>
  )
}

function StaffForm() {
  const { loginStaff } = useAuth()
  const navigate = useNavigate()
  const staff = useQuery({ queryKey: ['auth', 'staff'], queryFn: authApi.staff })
  const [role, setRole] = useState<StaffRole | null>(null)
  const [pin, setPin] = useState('')
  const [cashierId, setCashierId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Đăng nhập nhân viên chọn vai trò rồi nhập PIN của vai trò đó (tài khoản dùng chung, mỗi vai trò một PIN khác nhau).
  // Thu ngân và phục vụ chọn thêm tên trong số người đang chấm công; danh sách mọi tài khoản chỉ hiện ở trang chấm công.
  const station = (staff.data ?? []).find((a) => a.role === role && a.station)

  // Thu ngân và phục vụ là một người trong ca: chọn tên (trong số người cùng vai trò đang chấm công)
  // để đơn và hóa đơn ghi đúng người thực hiện.
  const pickable = role === 'CASHIER' || role === 'WAITER' ? role : null
  const onDuty = useQuery({
    queryKey: ['auth', 'on-duty', pickable],
    queryFn: () => authApi.onDuty(pickable!),
    enabled: pickable !== null,
  })
  const cashierList = pickable ? (onDuty.data ?? []) : []
  const needCashier = cashierList.length > 0

  const submit = async () => {
    setError(null)
    if (!role) return setError('Chọn vai trò trước khi nhập PIN.')
    if (!station) return setError('Vai trò này chưa có tài khoản đăng nhập. Hãy liên hệ Chủ quán.')
    if (needCashier && cashierId === null) return setError('Chọn tên của bạn trước khi nhập PIN.')
    const parsed = pinSchema.safeParse(pin)
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'PIN không hợp lệ.')
    setBusy(true)
    try {
      const u = await loginStaff(
        station.id,
        pin,
        needCashier ? (cashierId ?? undefined) : undefined,
      )
      navigate(HOME_BY_ROLE[u.role], { replace: true })
    } catch (e) {
      setPin('')
      setError(describeAuthError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-center text-xs font-bold uppercase">Chọn vai trò</p>
        <RoleTiles
          value={role}
          onChange={(r) => {
            setRole(r)
            setCashierId(null)
            setError(null)
          }}
        />
        {staff.isError && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {toApiError(staff.error).message}
          </p>
        )}
      </div>
      {needCashier && (
        <div>
          <p className="mb-2 text-center text-xs font-bold uppercase">
            {role === 'CASHIER' ? 'Thu ngân' : 'Nhân viên phục vụ'}
          </p>
          <select
            aria-label="Tên nhân viên"
            value={cashierId ?? ''}
            onChange={(e) => {
              setCashierId(e.target.value ? Number(e.target.value) : null)
              setError(null)
            }}
            className="vt-field min-h-12 w-full rounded-2xl border-2 border-white/90 bg-white/40 px-4 outline-none"
          >
            <option value="">Chọn tên của bạn…</option>
            {cashierList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <p className="mb-2 text-center text-xs font-bold uppercase">Nhập PIN</p>
        <PinPad value={pin} onChange={setPin} onSubmit={submit} disabled={busy} />
      </div>
      {error && (
        <p role="alert" className="text-center text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

/** Thông báo lỗi đăng nhập có số lần còn lại hoặc thời gian khóa (BR-042). */
function describeAuthError(e: unknown): string {
  const err = toApiError(e)
  if (err.code === 'LOCKED') {
    const mins = Math.max(1, Math.ceil((err.lockSeconds ?? 900) / 60))
    return `${err.message} Thử lại sau khoảng ${mins} phút.`
  }
  if (err.attemptsLeft) return `${err.message} Còn ${err.attemptsLeft} lần thử.`
  return err.message
}
