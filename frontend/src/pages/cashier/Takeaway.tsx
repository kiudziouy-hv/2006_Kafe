import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ItemOptionsSheet, { type ChosenItem } from '../../components/ItemOptionsSheet'
import MenuItemRow from '../../components/MenuItemRow'
import { Button, Chip, IconButton, Scrim, Thumb } from '../../components/ui'
import { MENU, money, useStore, type MenuItem, type PayMethod } from '../../store'
import CashierLayout from './CashierLayout'
import iconMinus from '../../assets/icons/minus.svg'
import iconPlus from '../../assets/icons/plus.svg'
import iconClose from '../../assets/icons/close.svg'

export type TakeawayCart = { items: ChosenItem[]; method: PayMethod }
// Giỏ mang đi được giữ giữa các màn (S21 → S23b)
export const takeawayCart: TakeawayCart = { items: [], method: 'cash' }

// S21 — Tạo đơn mang đi; S21b — Giỏ đơn mang đi (drawer)
export default function Takeaway() {
  const navigate = useNavigate()
  const { toast } = useStore()
  const [tab, setTab] = useState<'drink' | 'cake'>('drink')
  const [cart, setCart] = useState<ChosenItem[]>(takeawayCart.items)
  const [method, setMethod] = useState<PayMethod>(takeawayCart.method)
  const [picking, setPicking] = useState<MenuItem | null>(null)
  const [drawer, setDrawer] = useState(false)

  const items = MENU.filter((m) => (tab === 'cake' ? m.category === 'Cake' : m.category !== 'Cake'))
  const count = cart.reduce((s, c) => s + c.qty, 0)
  const total = cart.reduce((s, c) => s + c.qty * c.unitPrice, 0)

  const update = (next: ChosenItem[]) => {
    setCart(next)
    takeawayCart.items = next
  }

  const pick = (m: MenuItem) => {
    if (m.category === 'Cake') {
      update(merge(cart, { item: m, unitPrice: m.price, qty: 1, name: m.name, options: 'Bánh' }))
      toast({ type: 'success', title: 'Đã thêm vào đơn', message: `1× ${m.name}` })
    } else setPicking(m)
  }

  const confirm = () => {
    takeawayCart.method = method
    navigate('/thu-ngan/thanh-toan/mang-di')
  }

  return (
    <CashierLayout title="Đơn mang đi">
      <div className="flex flex-col gap-3 rounded-xl border border-border-default bg-bg-surface p-3">
        <div className="flex items-center gap-2">
          <Chip label="Đồ uống lạnh" selected={tab === 'drink'} onClick={() => setTab('drink')} />
          <Chip label="Bánh" selected={tab === 'cake'} onClick={() => setTab('cake')} />
          <button
            type="button"
            onClick={() => setDrawer(true)}
            className="ml-auto rounded-md bg-bg-subtle px-3 py-2 text-sm font-semibold drop-shadow-[0_2px_4px_rgba(58,36,16,0.1)]"
          >
            Đơn ({count}) · {money(total)}
          </button>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {items.map((m) => (
            <MenuItemRow key={m.id} item={m} onAdd={() => pick(m)} />
          ))}
        </div>
      </div>

      {picking && (
        <ItemOptionsSheet
          item={picking}
          onClose={() => setPicking(null)}
          onAdd={(c) => {
            update(merge(cart, c))
            setPicking(null)
            toast({ type: 'success', title: 'Đã thêm vào đơn', message: `${c.qty}× ${c.name}` })
          }}
        />
      )}

      {drawer && (
        <>
          <Scrim onClick={() => setDrawer(false)} />
          <aside className="fixed inset-y-0 right-0 z-50 flex animate-slide-in-right w-[min(460px,92vw)] flex-col border-l border-glass-stroke bg-[#e8e0d3]/95 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Đơn mang đi</h2>
              <IconButton icon={iconClose} label="Đóng" size="sm" onClick={() => setDrawer(false)} />
            </div>
            <div className="mt-4 flex-1 overflow-y-auto">
              {cart.map((c, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <Thumb size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="text-xs text-text-secondary">{c.options}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconButton icon={iconMinus} label="Giảm" size="sm" onClick={() => update(qty(cart, i, -1))} />
                    <span className="w-4 text-center text-sm font-semibold">{c.qty}</span>
                    <IconButton icon={iconPlus} label="Tăng" size="sm" onClick={() => update(qty(cart, i, 1))} />
                  </div>
                  <span className="w-20 text-right text-sm font-semibold">{money(c.qty * c.unitPrice)}</span>
                </div>
              ))}
              {cart.length === 0 && <p className="text-sm text-text-secondary">Chưa có món nào.</p>}
            </div>
            <div className="flex flex-col gap-3 border-t border-border-strong/40 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold">Tạm tính</span>
                <span className="text-xl font-bold">{money(total)}</span>
              </div>
              <p className="text-sm font-semibold">Phương thức thanh toán</p>
              <div className="flex gap-2">
                <Chip label="Tiền mặt" selected={method === 'cash'} onClick={() => setMethod('cash')} />
                <Chip label="Chuyển khoản / QR" selected={method === 'transfer'} onClick={() => setMethod('transfer')} />
              </div>
              <Button block disabled={cart.length === 0} onClick={confirm}>
                Xác nhận đơn · Thanh toán
              </Button>
            </div>
          </aside>
        </>
      )}
    </CashierLayout>
  )
}

function merge(cart: ChosenItem[], c: ChosenItem) {
  const i = cart.findIndex((x) => x.name === c.name && x.options === c.options)
  return i < 0 ? [...cart, c] : cart.map((x, j) => (j === i ? { ...x, qty: x.qty + c.qty } : x))
}
function qty(cart: ChosenItem[], i: number, d: number) {
  return cart.map((x, j) => (j === i ? { ...x, qty: x.qty + d } : x)).filter((x) => x.qty > 0)
}
