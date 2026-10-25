import { useState } from 'react'
import { Button, Checkbox, Chip, IconButton, Scrim, Thumb } from './ui'
import { TOPPINGS, money, type MenuItem } from '../store'
import iconClose from '../assets/icons/close.svg'
import iconMinus from '../assets/icons/minus.svg'
import iconPlus from '../assets/icons/plus.svg'

export type ChosenItem = { item: MenuItem; size?: string; unitPrice: number; qty: number; name: string; options: string }

const SUGAR = ['0%', '30%', '50%', '70%', '100%']
const ICE = ['Không đá', 'Ít đá', 'Bình thường']

type Props = { item: MenuItem; onClose: () => void; onAdd: (c: ChosenItem) => void; className?: string }

// S11b — Chọn tùy chọn món (bottom sheet). Bánh không có tùy chọn pha chế.
export default function ItemOptionsSheet({ item, onClose, onAdd, className = '' }: Props) {
  const firstSize = item.sizes?.find((s) => !s.soldOut)
  const [size, setSize] = useState(firstSize?.label)
  const [temp, setTemp] = useState('Lạnh')
  const [sugar, setSugar] = useState('50%')
  const [ice, setIce] = useState('Ít đá')
  const [toppings, setToppings] = useState<string[]>([])
  const [qty, setQty] = useState(1)
  const isDrink = item.category !== 'Cake'

  const sizePrice = item.sizes?.find((s) => s.label === size)?.price ?? item.price
  const toppingPrice = TOPPINGS.filter((t) => toppings.includes(t.id)).reduce((s, t) => s + t.price, 0)
  const unitPrice = sizePrice + toppingPrice

  const add = () => {
    const name = isDrink ? [item.name, size, temp].filter(Boolean).join(' · ') : item.name
    const opts = isDrink
      ? [`${sugar} đường`, temp === 'Lạnh' ? ice.toLowerCase() : null, ...TOPPINGS.filter((t) => toppings.includes(t.id)).map((t) => `+ ${t.name}`)]
          .filter(Boolean)
          .join(' · ')
      : ''
    onAdd({ item, size, unitPrice, qty, name, options: opts })
  }

  return (
    <>
      <Scrim onClick={onClose} />
      <div
        className={`fixed inset-x-0 bottom-0 z-50 mx-auto flex max-sm:animate-slide-up sm:animate-fade-in max-h-[85vh] w-full max-w-[480px] flex-col gap-3 overflow-y-auto rounded-t-[28px] border border-glass-stroke bg-[#efe8dc]/95 p-4 drop-shadow-[0_20px_24px_rgba(47,24,5,0.28)] backdrop-blur-xl sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-[28px] ${className}`}
      >
        <div className="flex items-center gap-3">
          <Thumb />
          <div className="min-w-0 flex-1">
            <p className="text-xl leading-7 font-semibold">{item.name}</p>
            <p className="text-xs text-text-secondary">{item.category}</p>
          </div>
          <IconButton icon={iconClose} label="Đóng" onClick={onClose} />
        </div>

        {item.sizes && (
          <Group title="Kích thước">
            {item.sizes.map((s) => (
              <Chip
                key={s.label}
                label={s.soldOut ? `${s.label} — Hết hàng` : `${s.label} — ${money(s.price)}`}
                selected={size === s.label}
                disabled={s.soldOut}
                onClick={() => setSize(s.label)}
              />
            ))}
          </Group>
        )}
        {isDrink && (
          <>
            <Group title="Nóng / Lạnh">
              {['Nóng', 'Lạnh'].map((v) => (
                <Chip key={v} label={v} selected={temp === v} onClick={() => setTemp(v)} />
              ))}
            </Group>
            <Group title="Mức đường">
              {SUGAR.map((v) => (
                <Chip key={v} label={v} selected={sugar === v} onClick={() => setSugar(v)} />
              ))}
            </Group>
            {temp === 'Lạnh' && (
              <Group title="Mức đá">
                {ICE.map((v) => (
                  <Chip key={v} label={v} selected={ice === v} onClick={() => setIce(v)} />
                ))}
              </Group>
            )}
            <p className="text-sm font-semibold">Topping (phụ phí)</p>
            <div className="flex flex-col gap-2">
              {TOPPINGS.map((t) => (
                <Checkbox
                  key={t.id}
                  label={`${t.name} (+${money(t.price)})${t.soldOut ? ' — Hết hàng' : ''}`}
                  checked={toppings.includes(t.id)}
                  disabled={t.soldOut}
                  onChange={(v) => setToppings(v ? [...toppings, t.id] : toppings.filter((x) => x !== t.id))}
                />
              ))}
            </div>
          </>
        )}

        <div className="flex items-center gap-3">
          <p className="flex-1 text-sm font-semibold">Số lượng</p>
          <IconButton icon={iconMinus} label="Giảm" onClick={() => setQty(Math.max(1, qty - 1))} />
          <span className="w-4 text-center text-base font-semibold">{qty}</span>
          <IconButton icon={iconPlus} label="Tăng" onClick={() => setQty(qty + 1)} />
        </div>
        <Button block onClick={add}>
          Thêm vào đơn · {money(unitPrice * qty)}
        </Button>
      </div>
    </>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <p className="text-sm font-semibold">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </>
  )
}
