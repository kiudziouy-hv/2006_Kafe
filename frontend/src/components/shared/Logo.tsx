import clsx from 'clsx'

/** Logo tròn "2006 Kafé" (public/logo.png, nền trong suốt). */
export function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="2006 Kafé"
      draggable={false}
      className={clsx('rounded-full object-cover shadow-[var(--shadow-lift)]', className)}
    />
  )
}
