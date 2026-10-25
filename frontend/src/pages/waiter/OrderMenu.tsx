import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ItemOptionsSheet, { type ChosenItem } from '../../components/ItemOptionsSheet'
import MenuItemRow from '../../components/MenuItemRow'
import { Alert, AppHeader, Button, Chip, IconButton, NotificationBell, Scrim, Screen, Thumb } from '../../components/ui'
import { MENU, nowHM, useStore, type Category, type MenuItem } from '../../store'
import iconMinus from '../../assets/icons/minus.svg'
import iconPlus from '../../assets/icons/plus.svg'
import iconClose from '../../assets/icons/close.svg'

const CATEGORIES: Category[] = ['Coffee', 'Tea', 'Smoothie', 'Cake']
// Nguyên liệu giả lập: Món mẫu 3 size L thiếu Sữa tươi (S12 — dòng không gửi được)
const OUT_OF_STOCK = (c: ChosenItem) => c.item.id === 'm3' && c.size === 'L'

// S11 — Chọn món; S11b — tùy chọn món; S12 — Xác nhận gửi đơn (drawer)
export default function OrderMenu() {
  const { id } = useParams()
  const tableId = Number(id)
  const navigate = useNavigate()
  const { tables, addLines, setTableStatus, toast } = useStore()
  const table = tables.find((t) => t.id === tableId)
  const [category, setCategory] = useState<Category>('Coffee')
  const [picking, setPicking] = useState<MenuItem | null>(null)
  const [cart, setCart] = useState<ChosenItem[]>([])
  const [drawer, setDrawer] = useState(false)

  if (!table) return <Screen>Không tìm thấy bàn.</Screen>

  const count = cart.reduce((s, c) => s + c.qty, 0)
  const blocked = cart.filter(OUT_OF_STOCK)

  const pick = (item: MenuItem) => {
    if (item.category === 'Cake' && !item.sizes) {
      setCart(mergeInto(cart, { item, unitPrice: item.price, qty: 1, name: item.name, options: 'Bánh' }))
      toast({ type: 'success', title: 'Đã thêm vào đơn', message: `1× ${item.name}` })
    } else setPicking(item)
  }

  const send = () => {
    const time = nowHM()
    addLines(
      tableId,
      cart.map((c, i) => ({
        id: `${tableId}-${Date.now()}-${i}`,
        qty: c.qty,
        name: c.name,
        options: c.options === 'Bánh' ? '' : c.options,
        price: c.unitPrice,
        status: 'new',
        sentAt: time,
        isCake: c.item.category === 'Cake',
      })),
    )
    setTableStatus(tableId, 'busy')
    toast({ type: 'success', title: 'Đã gửi đơn', message: `${table.name} · ${count} món đã gửi tới quầy pha chế.` })
    navigate(`/phuc-vu/ban/${tableId}`, { replace: true })
  }

  return (
    <Screen>
      <AppHeader title={`${table.name} · ${table.status === 'free' ? 'Tạo đơn' : 'Gọi thêm'}`} back right={<NotificationBell />} />
      <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-3">
        <div className="flex gap-2 overflow-x-auto px-4 py-3">
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} selected={category === c} onClick={() => setCategory(c)} />
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-2 px-4 pb-24">
          {MENU.filter((m) => m.category === category).map((m) => (
            <MenuItemRow key={m.id} item={m} onAdd={() => pick(m)} />
          ))}
        </div>
      </div>

      <div className="fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-[696px] items-center gap-3 rounded-2xl border border-glass-stroke bg-glass-fill px-4 py-3 shadow-glass backdrop-blur-md">
        <p className="flex-1 text-sm font-semibold">Đơn đang soạn: {count} món</p>
        <Button disabled={count === 0} onClick={() => setDrawer(true)}>
          Xem lại &amp; gửi
        </Button>
      </div>

      {picking && (
        <ItemOptionsSheet
          item={picking}
          onClose={() => setPicking(null)}
          onAdd={(c) => {
            setCart(mergeInto(cart, c))
            setPicking(null)
            toast({ type: 'success', title: 'Đã thêm vào đơn', message: `${c.qty}× ${c.name}` })
          }}
        />
      )}

      {drawer && (
        <>
          <Scrim onClick={() => setDrawer(false)} />
          <aside className="fixed inset-y-0 right-0 z-50 flex animate-slide-in-right w-[min(340px,88vw)] flex-col gap-2 border-l border-glass-stroke bg-[#e9e1d4]/95 drop-shadow-[0_16px_20px_rgba(58,36,16,0.28)] backdrop-blur-xl">
            <div className="flex items-center gap-3 p-4">
              <p className="flex-1 text-xl leading-7 font-semibold">{table.name} · Xem lại đơn</p>
              <IconButton icon={iconClose} label="Đóng" size="sm" onClick={() => setDrawer(false)} />
            </div>
            <div className="flex-1 overflow-y-auto">
              {cart.map((c, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Thumb size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="text-xs text-text-secondary">{c.options}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconButton icon={iconMinus} label="Giảm" size="sm" onClick={() => setCart(changeQty(cart, i, -1))} />
                    <span className="w-4 text-center text-sm font-semibold">{c.qty}</span>
                    <IconButton icon={iconPlus} label="Tăng" size="sm" onClick={() => setCart(changeQty(cart, i, 1))} />
                  </div>
                </div>
              ))}
              {cart.length === 0 && <p className="px-4 text-sm text-text-secondary">Chưa có món nào.</p>}
            </div>
            <div className="flex flex-col gap-3 p-4">
              {blocked.length > 0 && (
                <Alert
                  title="Không gửi được dòng này"
                  message={`Không đủ nguyên liệu (Sữa tươi) cho ${blocked[0].item.name}. Bỏ dòng hoặc đổi món.`}
                />
              )}
              <p className="text-xs text-text-secondary">Giá và khuyến mãi được chốt khi gửi.</p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setDrawer(false)}>
                  + Thêm món
                </Button>
                <Button className="flex-1" disabled={cart.length === 0 || blocked.length > 0} onClick={send}>
                  Gửi đơn
                </Button>
              </div>
            </div>
          </aside>
        </>
      )}
    </Screen>
  )
}

function mergeInto(cart: ChosenItem[], c: ChosenItem) {
  const i = cart.findIndex((x) => x.name === c.name && x.options === c.options)
  if (i < 0) return [...cart, c]
  return cart.map((x, j) => (j === i ? { ...x, qty: x.qty + c.qty } : x))
}

function changeQty(cart: ChosenItem[], i: number, d: number) {
  return cart.map((x, j) => (j === i ? { ...x, qty: x.qty + d } : x)).filter((x) => x.qty > 0)
}
