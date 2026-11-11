import clsx from 'clsx'
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

const control =
  'min-h-10 w-full rounded-xl border border-line bg-white px-3 py-2 outline-none transition focus:border-brass'

function Wrap({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs font-normal text-ink-soft">{hint}</span>}
    </label>
  )
}

interface TextProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

export function TextField({ label, hint, className, ...rest }: TextProps) {
  return (
    <Wrap label={label} hint={hint}>
      <input className={clsx(control, 'font-normal', className)} {...rest} />
    </Wrap>
  )
}

/** Ô nhập số nguyên không âm (tiền, số lượng): chỉ giữ chữ số. */
export function NumberField({
  label,
  hint,
  value,
  onValueChange,
  ...rest
}: Omit<TextProps, 'value' | 'onChange' | 'type'> & {
  value: string
  onValueChange: (v: string) => void
}) {
  return (
    <TextField
      label={label}
      hint={hint}
      inputMode="numeric"
      value={value}
      onChange={(e) => onValueChange(e.target.value.replace(/\D/g, ''))}
      {...rest}
    />
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hint?: string
}

export function SelectField({ label, hint, className, children, ...rest }: SelectProps) {
  return (
    <Wrap label={label} hint={hint}>
      <select className={clsx(control, 'font-normal', className)} {...rest}>
        {children}
      </select>
    </Wrap>
  )
}

interface AreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
}

export function TextAreaField({ label, className, ...rest }: AreaProps) {
  return (
    <Wrap label={label}>
      <textarea rows={3} className={clsx(control, 'font-normal', className)} {...rest} />
    </Wrap>
  )
}

export function CheckField({
  label,
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string }) {
  return (
    <label className={clsx('flex min-h-11 items-center gap-2 font-semibold', className)}>
      <input type="checkbox" className="h-5 w-5 accent-coffee-700" {...rest} />
      {label}
    </label>
  )
}
