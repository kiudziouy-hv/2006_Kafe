import clsx from 'clsx'

/** Tên quán "2006 Kafé" viết thống nhất ở mọi nơi: Playfair Display, đậm vừa. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={clsx('font-display font-semibold tracking-wide', className)}>2006 Kafé</span>
  )
}
