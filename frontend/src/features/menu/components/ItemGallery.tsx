import { Camera, Cake, Coffee, CupSoda, IceCreamCone, Pencil, type LucideIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import clsx from 'clsx'
import { Badge } from '@/components/ui/Badge'
import { useAction } from '@/hooks/useAction'
import { formatMoney, GROUP_LABEL } from '@/utils/format'
import { menuApi, STATUS_LABEL, type AdminItem, type ItemGroup } from '../api/menuApi'

const TONE = { SELLING: 'success', OUT_OF_STOCK: 'warning', STOPPED: 'neutral' } as const
const GROUP_ICON: Record<ItemGroup, LucideIcon> = {
  COFFEE: Coffee,
  TEA: CupSoda,
  SMOOTHIE: IceCreamCone,
  CAKE: Cake,
}
const GROUP_TINT: Record<ItemGroup, string> = {
  COFFEE: 'from-coffee-900 to-coffee-700',
  TEA: 'from-[#6b7a3a] to-[#8f9a52]',
  SMOOTHIE: 'from-[#a4553d] to-[#c9805f]',
  CAKE: 'from-[#8a5a3c] to-[#c99a4c]',
}

function priceText(i: AdminItem) {
  const prices = i.sizes.map((s) => s.price)
  if (prices.length === 0) return '—'
  const lo = Math.min(...prices)
  const hi = Math.max(...prices)
  return lo === hi ? formatMoney(lo) : `${formatMoney(lo)} – ${formatMoney(hi)}`
}

/** Thực đơn dạng thẻ ảnh: lọc theo nhóm, tải ảnh lên ngay trên thẻ, bấm Sửa để chỉnh món. */
export function ItemGallery({
  items,
  onEdit,
}: {
  items: AdminItem[]
  onEdit: (i: AdminItem) => void
}) {
  const [group, setGroup] = useState<ItemGroup | 'ALL'>('ALL')
  const shown = group === 'ALL' ? items : items.filter((i) => i.group === group)
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Lọc theo nhóm">
        {(['ALL', 'COFFEE', 'TEA', 'SMOOTHIE', 'CAKE'] as const).map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={group === g}
            onClick={() => setGroup(g)}
            className={clsx(
              'vt-tab min-h-9 rounded-full px-4 text-sm font-semibold',
              group === g
                ? 'bg-gradient-to-r from-coffee-900 to-coffee-700 text-ivory'
                : 'bg-white/70 hover:bg-coffee-100',
            )}
          >
            {g === 'ALL' ? `Tất cả (${items.length})` : GROUP_LABEL[g]}
          </button>
        ))}
      </div>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((i) => (
          <ItemCard key={i.id} item={i} onEdit={() => onEdit(i)} />
        ))}
      </ul>
    </div>
  )
}

function ItemCard({ item, onEdit }: { item: AdminItem; onEdit: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const upload = useAction((f: File) => menuApi.uploadImage(item.id, f), {
    invalidate: [['admin', 'items']],
    success: 'Đã cập nhật ảnh món',
  })
  const Icon = GROUP_ICON[item.group]
  return (
    <li className="vt-card vt-hover-lift group overflow-hidden !p-0">
      <div className="relative aspect-[4/3] overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
          />
        ) : (
          <div
            className={clsx(
              'grid h-full w-full place-items-center bg-gradient-to-br text-brass-light/80',
              GROUP_TINT[item.group],
            )}
          >
            <div className="flex flex-col items-center gap-2">
              <Icon size={52} strokeWidth={1.4} aria-hidden />
              <button
                type="button"
                onClick={() => input.current?.click()}
                disabled={upload.isPending}
                className="rounded-full border border-brass-light/60 px-3 py-1 text-xs font-semibold text-brass-light hover:bg-coffee-950/30"
              >
                Thêm ảnh
              </button>
            </div>
          </div>
        )}
        {item.imageUrl && (
          <div className="absolute inset-0 bg-gradient-to-t from-coffee-950/50 via-transparent to-transparent" />
        )}
        <div className="absolute left-3 top-3">
          <Badge tone={TONE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
        </div>
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={upload.isPending}
          aria-label={`Đổi ảnh ${item.name}`}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-coffee-950/70 text-brass-light opacity-0 transition hover:bg-coffee-950 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Camera size={17} aria-hidden />
        </button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label={`Chọn ảnh cho ${item.name}`}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) upload.mutate(f)
            e.target.value = ''
          }}
        />
      </div>
      <div className="flex items-start justify-between gap-2 p-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-ink-soft">
            {GROUP_LABEL[item.group]}
          </p>
          <h3 className="truncate text-lg font-bold">{item.name}</h3>
          <p className="font-semibold text-coffee-700">{priceText(item)}</p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Sửa ${item.name}`}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-brass/60 bg-white/70 hover:bg-coffee-100"
        >
          <Pencil size={16} aria-hidden />
        </button>
      </div>
    </li>
  )
}
