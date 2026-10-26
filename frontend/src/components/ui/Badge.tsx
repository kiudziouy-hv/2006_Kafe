import clsx from 'clsx'
import type { ReactNode } from 'react'

const tones = {
  neutral: 'bg-coffee-100 text-coffee-900',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
} as const

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: keyof typeof tones
  children: ReactNode
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border border-current/25 px-3 py-1 text-xs font-semibold',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}
