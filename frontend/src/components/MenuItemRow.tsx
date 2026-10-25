import { Badge, IconButton, Thumb } from './ui'
import { money, type MenuItem } from '../store'
import iconPlusWhite from '../assets/icons/plus-white.svg'
import iconPlusDisabled from '../assets/icons/plus-disabled.svg'

// Menu Item Row (Figma 28:411). SoldOut: hết hàng, không thêm được.
export default function MenuItemRow({ item, onAdd }: { item: MenuItem; onAdd: () => void }) {
  const soldOut = item.soldOut
  return (
    <div className={`flex w-full items-center gap-3 rounded-xl border border-border-default p-3 transition-colors hover:bg-white/70 ${soldOut ? 'bg-bg-subtle' : 'bg-bg-surface'}`}>
      <Thumb dim={soldOut} />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
        <p className={`text-sm font-semibold ${soldOut ? 'text-text-secondary' : ''}`}>{item.name}</p>
        <p className="text-xs text-text-secondary">từ {money(item.price)}</p>
        {soldOut && <Badge label="Hết hàng" />}
      </div>
      {soldOut ? (
        <IconButton icon={iconPlusDisabled} label="Hết hàng" variant="disabled" />
      ) : (
        <IconButton icon={iconPlusWhite} label={`Thêm ${item.name}`} variant="primary" onClick={onAdd} />
      )}
    </div>
  )
}
