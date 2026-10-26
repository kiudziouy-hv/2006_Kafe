import clsx from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

const styles: Record<Variant, string> = {
  primary: 'vt-btn vt-btn-primary',
  secondary: 'vt-btn vt-btn-secondary',
  danger: 'vt-btn vt-btn-danger',
  ghost: 'vt-btn vt-btn-ghost',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
}

export function Button({
  variant = 'primary',
  loading,
  className,
  disabled,
  children,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={clsx(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-semibold',
        'disabled:cursor-not-allowed disabled:opacity-50',
        styles[variant],
        className,
      )}
      {...rest}
    >
      {loading ? 'Đang xử lý…' : children}
    </button>
  )
}
