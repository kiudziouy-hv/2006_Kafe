type Props = {
  value: string
  length?: number
  disabled?: boolean
  onChange: (value: string) => void
  onSubmit: () => void
}

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Xóa', '0', 'OK']

export default function PinKeypad({ value, length = 6, disabled, onChange, onSubmit }: Props) {
  const press = (k: string) => {
    if (k === 'Xóa') onChange(value.slice(0, -1))
    else if (k === 'OK') onSubmit()
    else if (value.length < length) onChange(value + k)
  }

  return (
    <div className={`flex flex-col gap-2.5 ${disabled ? 'pointer-events-none opacity-35' : ''}`}>
      <div className="flex w-full justify-center gap-2 lg:gap-2.5">
        {Array.from({ length }, (_, i) => (
          <div
            key={i}
            className="flex h-10 w-11 items-center justify-center rounded-[14px] border-[1.5px] border-pin-stroke bg-cream-field lg:h-[42px] lg:w-[50px] lg:rounded-2xl"
          >
            {(disabled || i < value.length) && <span className="size-2.5 rounded-full bg-text-primary" />}
          </div>
        ))}
      </div>
      <div className="grid w-full grid-cols-3 gap-x-2 gap-y-1.5">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            disabled={disabled}
            onClick={() => press(k)}
            className="h-10 rounded-[14px] border-2 border-cream-stroke bg-cream-field text-lg font-semibold text-ink transition hover:bg-[#fbf3df] active:scale-95 lg:h-[42px] lg:rounded-2xl lg:text-[19px]"
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  )
}
