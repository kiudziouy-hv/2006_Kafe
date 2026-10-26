import { Cake, Coffee, CupSoda, IceCreamCone, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import { Badge } from '@/components/ui/Badge'
import { useAction } from '@/hooks/useAction'
import { formatMoney, GROUP_LABEL } from '@/utils/format'
import { ImageTile } from './ImageTile'
import { menuApi, STATUS_LABEL, type AdminItem, type ItemGroup } from '../api/menuApi'

const TONE = { SELLING: 'success', OUT_OF_STOCK: 'warning', STOPPED: 'neutral' } as const
const GROUP_ICON: Record<ItemGroup, LucideIcon> = {
  COFFEE: Coffee,
  TEA: CupSoda,
  SMOOTHIE: IceCreamCone,
  CAKE: Cake,
}
const GROUP_TINT: Record<ItemGroup, string> = {
  COFFEE: 'from-[#efe5ce] to-[#e2d3b0]',
  TEA: 'from-[#eaecd3] to-[#d6dbb0]',
  SMOOTHIE: 'from-[#f6e3d6] to-[#ecc9b3]',
  CAKE: 'from-[#f6ead0] to-[#ead09a]',
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
  const upload = useAction((f: File) => menuApi.uploadImage(item.id, f), {
    invalidate: [['admin', 'items']],
    success: 'Đã cập nhật ảnh món',
  })
  return (
    <ImageTile
      name={item.name}
      eyebrow={GROUP_LABEL[item.group]}
      subtitle={priceText(item)}
      imageUrl={item.imageUrl}
      badge={<Badge tone={TONE[item.status]}>{STATUS_LABEL[item.status]}</Badge>}
      icon={GROUP_ICON[item.group]}
      tint={GROUP_TINT[item.group]}
      uploading={upload.isPending}
      onUpload={(f) => upload.mutate(f)}
      onEdit={onEdit}
    />
  )
}
