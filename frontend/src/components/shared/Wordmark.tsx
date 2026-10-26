import clsx from 'clsx'

function Bean({ tilt }: { tilt: number }) {
  return (
    <svg
      viewBox="0 0 28 40"
      aria-hidden
      className="inline-block h-[0.8em] w-[0.56em] translate-y-[0.02em]"
      style={{ rotate: `${tilt}deg` }}
    >
      <ellipse cx="14" cy="20" rx="13" ry="19" fill="currentColor" />
      <path
        d="M15 2C3 12 25 28 13 38"
        stroke="var(--color-canvas)"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Logo chữ "2006 KAFÉ" với hai chữ 0 là hạt cà phê (theo Figma). */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={clsx('inline-flex items-center font-bold tracking-wide', className)}
      aria-label="2006 KAFÉ"
    >
      <span aria-hidden>2</span>
      <Bean tilt={-8} />
      <Bean tilt={8} />
      <span aria-hidden>6&nbsp;KAFÉ</span>
    </span>
  )
}
