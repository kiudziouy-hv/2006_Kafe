import clsx from 'clsx'
import { Camera, Pencil, type LucideIcon } from 'lucide-react'
import { useRef, type ReactNode } from 'react'

/** Thẻ ảnh dùng chung cho món và topping: ảnh (hoặc khung màu), nhãn trạng thái, nút đổi ảnh, nút sửa. */
export function ImageTile({
  name,
  eyebrow,
  subtitle,
  imageUrl,
  badge,
  icon: Icon,
  tint,
  uploading,
  onUpload,
  onEdit,
}: {
  name: string
  eyebrow?: string
  subtitle?: string
  imageUrl: string | null
  badge: ReactNode
  icon: LucideIcon
  tint: string
  uploading: boolean
  onUpload: (file: File) => void
  onEdit: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const pick = () => input.current?.click()
  return (
    <li className="vt-card vt-hover-lift group overflow-hidden !p-0">
      <div className="relative aspect-[4/3] overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
          />
        ) : (
          <div
            className={clsx(
              'grid h-full w-full place-items-center bg-gradient-to-br text-coffee-600/70',
              tint,
            )}
          >
            <div className="flex flex-col items-center gap-2">
              <Icon size={48} strokeWidth={1.4} aria-hidden />
              <button
                type="button"
                onClick={pick}
                disabled={uploading}
                className="rounded-full border border-brass/60 bg-white/70 px-3 py-1 text-xs font-semibold text-coffee-700 hover:bg-white"
              >
                Thêm ảnh
              </button>
            </div>
          </div>
        )}
        {imageUrl && (
          <div className="absolute inset-0 bg-gradient-to-t from-coffee-950/50 via-transparent to-transparent" />
        )}
        <div className="absolute left-3 top-3">{badge}</div>
        <button
          type="button"
          onClick={pick}
          disabled={uploading}
          aria-label={`Đổi ảnh ${name}`}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-coffee-950/70 text-brass-light opacity-0 transition hover:bg-coffee-950 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Camera size={17} aria-hidden />
        </button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label={`Chọn ảnh cho ${name}`}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onUpload(f)
            e.target.value = ''
          }}
        />
      </div>
      <div className="flex items-start justify-between gap-2 p-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[11px] uppercase tracking-[0.15em] text-ink-soft">{eyebrow}</p>
          )}
          <h3 className="truncate text-lg font-semibold">{name}</h3>
          {subtitle && <p className="font-semibold text-coffee-700">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Sửa ${name}`}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-white transition hover:border-brass"
        >
          <Pencil size={15} aria-hidden />
        </button>
      </div>
    </li>
  )
}
