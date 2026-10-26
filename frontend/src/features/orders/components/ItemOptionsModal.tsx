import clsx from 'clsx'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { formatMoney } from '@/utils/format'
import { ICE_LEVELS, SUGAR_LEVELS, type MenuItem, type MenuTopping } from '../api/ordersApi'
import { nextKey, type CartLine } from './Cart'

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        'vt-hover-lift inline-flex min-h-11 items-center gap-2 rounded-full border px-4 font-semibold',
        active
          ? 'border-brass-dark bg-gradient-to-r from-coffee-900 to-coffee-700 text-ivory'
          : 'border-brass/50 bg-white/70 hover:border-brass hover:bg-coffee-100',
      )}
    >
      {children}
    </button>
  )
}

/** Chọn kích thước, nóng/lạnh, mức đường, mức đá, topping và số lượng cho một món (UC-08 bước 3). */
export function ItemOptionsModal({
  item,
  toppings,
  takeaway,
  onAdd,
  onClose,
}: {
  item: MenuItem
  toppings: MenuTopping[]
  takeaway: boolean
  onAdd: (line: CartLine) => void
  onClose: () => void
}) {
  const sellable = item.sizes
  const [sizeCode, setSizeCode] = useState(sellable[0]?.code ?? 'M')
  const canHot = !item.cake && !item.coldOnly && !takeaway
  const canCold = !item.cake && !item.hotOnly
  const [temp, setTemp] = useState<'HOT' | 'COLD'>(canCold ? 'COLD' : 'HOT')
  const [sugar, setSugar] = useState('50')
  const [ice, setIce] = useState('NORMAL')
  const [picked, setPicked] = useState<number[]>([])
  const [qty, setQty] = useState(1)
  const size = sellable.find((s) => s.code === sizeCode) ?? sellable[0]!
  const allowed = toppings.filter((t) => item.toppingIds.includes(t.id) && t.status === 'ACTIVE')
  const chosen = allowed.filter((t) => picked.includes(t.id))
  const price = size.price + chosen.reduce((s, t) => s + t.price, 0)

  return (
    <Modal title={item.name} onClose={onClose}>
      <div className="flex flex-col gap-4">
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="aspect-[16/9] w-full rounded-2xl border border-brass/50 object-cover"
          />
        )}
        {sellable.length > 1 && (
          <fieldset>
            <legend className="mb-1 text-sm font-semibold">Kích thước</legend>
            <div className="flex flex-wrap gap-2">
              {sellable.map((s) => (
                <Chip
                  key={s.code}
                  active={s.code === size.code}
                  onClick={() => setSizeCode(s.code)}
                >
                  {s.label} · {formatMoney(s.price)}
                </Chip>
              ))}
            </div>
          </fieldset>
        )}
        {!item.cake && (
          <>
            {canHot && canCold && (
              <fieldset>
                <legend className="mb-1 text-sm font-semibold">Nóng / lạnh</legend>
                <div className="flex gap-2">
                  <Chip active={temp === 'HOT'} onClick={() => setTemp('HOT')}>
                    Nóng
                  </Chip>
                  <Chip active={temp === 'COLD'} onClick={() => setTemp('COLD')}>
                    Lạnh
                  </Chip>
                </div>
              </fieldset>
            )}
            <fieldset>
              <legend className="mb-1 text-sm font-semibold">Mức đường (%)</legend>
              <div className="flex flex-wrap gap-2">
                {SUGAR_LEVELS.map((s) => (
                  <Chip key={s} active={sugar === s} onClick={() => setSugar(s)}>
                    {s}%
                  </Chip>
                ))}
              </div>
            </fieldset>
            {canCold && (
              // Luôn hiện để hộp thoại không đổi chiều cao khi chuyển Nóng/Lạnh; đồ nóng thì mờ đi, không chọn được.
              <fieldset
                disabled={temp === 'HOT'}
                className={temp === 'HOT' ? 'opacity-40' : undefined}
              >
                <legend className="mb-1 text-sm font-semibold">
                  Mức đá
                  {temp === 'HOT' && <span className="font-normal"> (đồ nóng không dùng đá)</span>}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {ICE_LEVELS.map((i) => (
                    <Chip key={i.value} active={ice === i.value} onClick={() => setIce(i.value)}>
                      {i.label}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            )}
            {allowed.length > 0 && (
              <fieldset>
                <legend className="mb-1 text-sm font-semibold">Topping</legend>
                <div className="flex flex-wrap gap-2">
                  {allowed.map((t) => (
                    <Chip
                      key={t.id}
                      active={picked.includes(t.id)}
                      onClick={() =>
                        setPicked((cur) =>
                          cur.includes(t.id) ? cur.filter((x) => x !== t.id) : [...cur, t.id],
                        )
                      }
                    >
                      {t.imageUrl && (
                        <img
                          src={t.imageUrl}
                          alt=""
                          className="-ml-2 h-7 w-7 rounded-full object-cover"
                        />
                      )}
                      {t.name} +{formatMoney(t.price)}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            )}
          </>
        )}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2" role="group" aria-label="Số lượng">
            <Button
              variant="secondary"
              aria-label="Giảm"
              disabled={qty <= 1}
              onClick={() => setQty(qty - 1)}
            >
              −
            </Button>
            <span className="w-8 text-center text-lg font-bold">{qty}</span>
            <Button
              variant="secondary"
              aria-label="Tăng"
              disabled={qty >= 20}
              onClick={() => setQty(qty + 1)}
            >
              +
            </Button>
          </div>
          <Button
            onClick={() => {
              onAdd({
                key: nextKey(),
                item,
                size,
                temp: item.cake ? undefined : temp,
                sugar: item.cake ? undefined : sugar,
                ice: item.cake || temp === 'HOT' ? undefined : ice,
                toppings: chosen,
                qty,
              })
              onClose()
            }}
          >
            Thêm · {formatMoney(price * qty)}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
