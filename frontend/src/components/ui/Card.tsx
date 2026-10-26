import clsx from 'clsx'
import type { HTMLAttributes } from 'react'

/** Thẻ nền kính theo quy tắc glass của Figma (nền trắng mờ, viền trắng). */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('vt-card p-4 sm:p-5', className)} {...rest} />
}
