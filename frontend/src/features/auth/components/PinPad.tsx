import clsx from 'clsx'

interface Props {
  value: string
  length?: number
  disabled?: boolean
  onChange: (v: string) => void
  onSubmit: () => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Xóa', '0', 'OK'] as const

/** Bàn phím số PIN (UC-01). Đồng thời nhận phím số, Backspace và Enter từ bàn phím thật. */
export function PinPad({ value, length = 6, disabled, onChange, onSubmit }: Props) {
  const press = (k: (typeof KEYS)[number]) => {
    if (disabled) return
    if (k === 'Xóa') onChange(value.slice(0, -1))
    else if (k === 'OK') onSubmit()
    else if (value.length < length) onChange(value + k)
  }

  return (
    <div
      onKeyDown={(e) => {
        if (/^\d$/.test(e.key)) press(e.key as (typeof KEYS)[number])
        else if (e.key === 'Backspace') press('Xóa')
        else if (e.key === 'Enter') press('OK')
      }}
    >
      <div
        className="mb-3 flex justify-center gap-2"
        role="img"
        aria-label={`Đã nhập ${value.length}/${length} chữ số`}
      >
        {Array.from({ length }, (_, i) => (
          <span
            key={i}
            className={clsx(
              'grid h-10 w-9 place-items-center rounded-xl border border-line bg-white/60 text-lg',
              i < value.length && 'border-coffee-700',
            )}
          >
            {i < value.length ? '•' : ''}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            disabled={disabled}
            onClick={() => press(k)}
            className="vt-hover-lift min-h-11 rounded-xl border border-brass/50 bg-gradient-to-b from-ivory to-coffee-100 font-semibold hover:border-brass disabled:opacity-50"
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  )
}
