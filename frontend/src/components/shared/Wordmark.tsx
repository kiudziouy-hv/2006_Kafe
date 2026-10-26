import clsx from 'clsx'

/** Chữ "2006 Kafé" (public/wordmark.png) dùng thống nhất ở mọi nơi; chỉnh cỡ bằng chiều cao (h-*). */
export function Wordmark({ className }: { className?: string }) {
  return (
    <img
      src="/wordmark.png"
      alt="2006 Kafé"
      draggable={false}
      className={clsx('w-auto select-none object-contain', className)}
    />
  )
}
