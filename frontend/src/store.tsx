import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import Toast, { type ToastData } from './components/Toast'

// Trạng thái dùng chung cho toàn ứng dụng (dữ liệu giả, chưa có backend).

export type TableStatus = 'free' | 'busy' | 'waiting'
export type Table = { id: number; name: string; area: string; status: TableStatus }

export type LineStatus = 'new' | 'brewing' | 'done' | 'cancelled'
export type OrderLine = {
  id: string
  qty: number
  name: string
  options: string
  price: number
  status: LineStatus
  sentAt: string
  isCake?: boolean
}

export type Category = 'Coffee' | 'Tea' | 'Smoothie' | 'Cake'
export type MenuItem = {
  id: string
  name: string
  category: Category
  price: number
  soldOut?: boolean
  sizes?: { label: string; price: number; soldOut?: boolean }[]
}

export const AREAS = ['Góc hoài niệm', 'Hiên nắng']

const initialTables: Table[] = [
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({ id: i, name: `Bàn ${i}`, area: AREAS[0], status: 'free' as TableStatus })),
  ...[9, 10, 11, 12, 13, 14].map((i) => ({ id: i, name: `Bàn ${i}`, area: AREAS[1], status: 'free' as TableStatus })),
].map((t) => ({ ...t, status: ([2, 3, 9].includes(t.id) ? 'busy' : [5, 12].includes(t.id) ? 'waiting' : 'free') as TableStatus }))

export const MENU: MenuItem[] = [
  { id: 'm1', name: 'Món mẫu 1', category: 'Coffee', price: 35000, sizes: [{ label: 'M', price: 35000 }, { label: 'L', price: 42000, soldOut: true }] },
  { id: 'm2', name: 'Món mẫu 2', category: 'Coffee', price: 40000, sizes: [{ label: 'M', price: 40000 }, { label: 'L', price: 47000 }] },
  { id: 'm3', name: 'Món mẫu 3', category: 'Coffee', price: 45000, sizes: [{ label: 'M', price: 45000 }, { label: 'L', price: 52000 }] },
  { id: 'm4', name: 'Món mẫu 4', category: 'Coffee', price: 39000, soldOut: true },
  { id: 'm5', name: 'Món mẫu 5', category: 'Coffee', price: 42000, sizes: [{ label: 'M', price: 42000 }, { label: 'L', price: 49000 }] },
  { id: 't1', name: 'Trà mẫu 1', category: 'Tea', price: 38000, sizes: [{ label: 'M', price: 38000 }, { label: 'L', price: 45000 }] },
  { id: 't2', name: 'Trà mẫu 2', category: 'Tea', price: 41000, sizes: [{ label: 'M', price: 41000 }] },
  { id: 's1', name: 'Smoothie mẫu 1', category: 'Smoothie', price: 49000, sizes: [{ label: 'M', price: 49000 }] },
  { id: 'c1', name: 'Bánh mẫu 1', category: 'Cake', price: 32000 },
  { id: 'c2', name: 'Bánh mẫu 2', category: 'Cake', price: 35000 },
]

export const TOPPINGS = [
  { id: 'tp1', name: 'Topping mẫu 1', price: 5000 },
  { id: 'tp2', name: 'Topping mẫu 2', price: 7000 },
  { id: 'tp3', name: 'Topping mẫu 3', price: 5000, soldOut: true },
]

const initialOrders: Record<number, OrderLine[]> = {
  2: [{ id: 'o21', qty: 1, name: 'Món mẫu 2 · M · Nóng', options: '50% đường', price: 40000, status: 'brewing', sentAt: '10:30' }],
  3: [
    { id: 'o31', qty: 1, name: 'Món mẫu 5 · M · Nóng', options: '70% đường', price: 42000, status: 'done', sentAt: '10:38' },
    { id: 'o32', qty: 1, name: 'Món mẫu 1 · M · Lạnh', options: '50% đường · ít đá', price: 35000, status: 'brewing', sentAt: '10:40' },
    { id: 'o33', qty: 1, name: 'Bánh mẫu 2', options: '', price: 35000, status: 'new', sentAt: '10:44', isCake: true },
  ],
  5: [
    { id: 'o51', qty: 2, name: 'Món mẫu 3 · M · Lạnh', options: '30% đường', price: 45000, status: 'done', sentAt: '09:58' },
    { id: 'o52', qty: 1, name: 'Bánh mẫu 1', options: '', price: 32000, status: 'done', sentAt: '10:01', isCake: true },
  ],
  9: [{ id: 'o91', qty: 1, name: 'Bánh mẫu 1', options: '', price: 32000, status: 'new', sentAt: '10:50', isCake: true }],
  12: [{ id: 'o121', qty: 1, name: 'Trà mẫu 1 · M · Lạnh', options: '50% đường · ít đá', price: 38000, status: 'done', sentAt: '10:12' }],
}

export type Notice = { id: string; type: 'success' | 'error'; title: string; body: string; time: string; read: boolean }

const initialNotices: Notice[] = [
  { id: 'n1', type: 'success', title: 'Bàn 1 xong, cần mang ra', body: '2× Món mẫu 1 đã sẵn sàng. Mang ra bàn cho khách.', time: '10:52', read: false },
  { id: 'n2', type: 'error', title: 'Hết nguyên liệu: Sữa tươi', body: 'Món mẫu 2 · size L tạm Hết hàng.', time: '10:46', read: false },
  { id: 'n3', type: 'success', title: 'Bàn 3: món đã xong', body: '1× Món mẫu 5 đã sẵn sàng.', time: '10:38', read: true },
  { id: 'n4', type: 'error', title: 'Hết nguyên liệu: Topping mẫu 3', body: 'Topping mẫu 3 tạm Hết hàng.', time: '09:50', read: true },
]

export type PayMethod = 'cash' | 'transfer'
export type Invoice = {
  id: string
  time: string
  kind: string
  method: PayMethod
  total: number
  cancelled?: boolean
  lines: { qty: number; name: string; amount: number }[]
  discount: number
  pointsUsed: number
  pointsEarned: number
}
export type Draft = { id: string; createdAt: string; items: string; amount: number; points?: number; changedAmount?: number }
export type Member = { phone: string; name: string; points: number }

export const MEMBERS: Member[] = [{ phone: '0912345678', name: 'Khách mẫu', points: 120 }]

const initialInvoices: Invoice[] = [
  {
    id: 'HĐ mẫu 1', time: '10:50', kind: 'Tại quán', method: 'cash', total: 137000, discount: 4000, pointsUsed: 10, pointsEarned: 13,
    lines: [{ qty: 2, name: 'Món mẫu 1 (M, + Topping 1)', amount: 76000 }, { qty: 1, name: 'Món mẫu 2 (L)', amount: 45000 }, { qty: 1, name: 'Bánh mẫu 1', amount: 30000 }],
  },
  { id: 'HĐ mẫu 2', time: '10:20', kind: 'Mang đi #002', method: 'transfer', total: 85000, discount: 0, pointsUsed: 0, pointsEarned: 8, lines: [{ qty: 2, name: 'Món mẫu 2 (M)', amount: 85000 }] },
  { id: 'HĐ mẫu 3', time: '09:40', kind: 'Tại quán', method: 'cash', total: 60000, cancelled: true, discount: 0, pointsUsed: 0, pointsEarned: 0, lines: [{ qty: 2, name: 'Bánh mẫu 1', amount: 60000 }] },
]

const initialDrafts: Draft[] = [
  { id: '#001', createdAt: '10:55', items: '1× Món mẫu 1 · M · Lạnh; 1× Bánh mẫu 1', amount: 65000, points: 10 },
  { id: '#002', createdAt: '11:02', items: '2× Món mẫu 2 · L · Lạnh', amount: 80000, changedAmount: 65000 },
]

export type Shift = { open: boolean; opening: number; name: 'Ca sáng' | 'Ca tối'; cashRevenue: number; refunds: number }

export type Ingredient = { id: string; name: string; unit: string; stock: number; min: number; trackExpiry: boolean; used?: boolean }

export const INGREDIENTS: Ingredient[] = [
  { id: 'i1', name: 'Nguyên liệu mẫu 1', unit: 'g', stock: 5200, min: 2000, trackExpiry: false, used: true },
  { id: 'i2', name: 'Sữa tươi', unit: 'ml', stock: 1800, min: 3000, trackExpiry: true, used: true },
  { id: 'i3', name: 'Bánh mẫu 1', unit: 'cái', stock: 12, min: 6, trackExpiry: true, used: true },
  { id: 'i4', name: 'Ly nhựa mẫu', unit: 'cái', stock: 300, min: 100, trackExpiry: false, used: true },
  { id: 'i5', name: 'Nắp mẫu', unit: 'cái', stock: 280, min: 100, trackExpiry: false, used: true },
  { id: 'i6', name: 'Nguyên liệu mẫu 4', unit: 'g', stock: 150, min: 500, trackExpiry: false },
]

export type Adjustment = { time: string; ingredient: string; before: number; after: number; reason: string; by: string }
const initialAdjustments: Adjustment[] = [
  { time: '19/10 22:10', ingredient: 'Sữa tươi', before: 2100, after: 2000, reason: 'Đổ khi kiểm kê', by: 'Chủ quán mẫu' },
  { time: '18/10 22:05', ingredient: 'Bánh mẫu 1', before: 8, after: 7, reason: 'Kiểm kê lệch', by: 'Chủ quán mẫu' },
]

export const stamp = () => {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
}

export type WasteStatus = 'proposed' | 'confirmed' | 'rejected'
export type Waste = { id: string; date: string; ingredient: string; qty: number; unit: string; reason: string; note: string; by: string; status: WasteStatus; rejectReason?: string }

const initialWastes: Waste[] = [
  { id: 'HH-001', date: '20/10 10:30', ingredient: 'Sữa tươi', qty: 500, unit: 'ml', reason: 'Hết hạn', note: 'Lô 18/10', by: 'Pha chế mẫu A', status: 'proposed' },
  { id: 'HH-002', date: '20/10 09:15', ingredient: 'Nguyên liệu mẫu 1', qty: 200, unit: 'g', reason: 'Đổ vỡ', note: '', by: 'Pha chế mẫu A', status: 'proposed' },
  { id: 'HH-003', date: '19/10 21:10', ingredient: 'Bánh mẫu 1', qty: 2, unit: 'cái', reason: 'Hư hỏng', note: '', by: 'Pha chế mẫu A', status: 'confirmed' },
  { id: 'HH-004', date: '19/10 15:02', ingredient: 'Nguyên liệu mẫu 1', qty: 50, unit: 'g', reason: 'Đổ vỡ', note: 'Rơi khi xay', by: 'Pha chế mẫu A', status: 'rejected', rejectReason: 'Số lượng không khớp kiểm đếm' },
  { id: 'HH-005', date: '19/10 11:30', ingredient: 'Sữa tươi', qty: 200, unit: 'ml', reason: 'Hủy món đang pha', note: 'Bàn 3', by: 'Hệ thống', status: 'confirmed' },
]

export type Promo = { id: string; name: string; group: string; percent: number; from?: string; to?: string; startTime?: string; endTime?: string; active: boolean; used: boolean }

const initialPromos: Promo[] = [
  { id: 'p1', name: 'KM mẫu 1', group: 'Coffee', percent: 20, from: '2026-10-20', to: '2026-10-31', startTime: '14:00', endTime: '16:00', active: true, used: true },
  { id: 'p2', name: 'KM mẫu 2', group: 'Cake', percent: 10, active: false, used: false },
]

type Store = {
  ingredients: Ingredient[]
  saveIngredient: (i: Ingredient) => void
  removeIngredient: (id: string) => void
  changeStock: (name: string, delta: number) => void
  adjustments: Adjustment[]
  addAdjustment: (a: Adjustment) => void
  promos: Promo[]
  savePromo: (p: Promo) => void
  removePromo: (id: string) => void
  wastes: Waste[]
  addWaste: (w: Waste) => void
  updateWaste: (id: string, patch: Partial<Waste>) => void
  shift: Shift
  setShift: (s: Shift) => void
  invoices: Invoice[]
  addInvoice: (i: Invoice) => void
  updateInvoice: (id: string, patch: Partial<Invoice>) => void
  drafts: Draft[]
  removeDraft: (id: string) => void
  addDraft: (d: Draft) => void
  members: Member[]
  addMember: (m: Member) => void
  tables: Table[]
  orders: Record<number, OrderLine[]>
  notices: Notice[]
  setTableStatus: (id: number, status: TableStatus) => void
  addLines: (tableId: number, lines: OrderLine[]) => void
  updateLine: (tableId: number, lineId: string, patch: Partial<OrderLine>) => void
  removeLine: (tableId: number, lineId: string) => void
  moveOrder: (from: number, to: number) => void
  clearTable: (id: number) => void
  markNoticesRead: () => void
  toast: (t: ToastData) => void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [tables, setTables] = useState(initialTables)
  const [orders, setOrders] = useState(initialOrders)
  const [notices, setNotices] = useState(initialNotices)
  const [toastData, setToastData] = useState<ToastData | null>(null)
  const closeToast = useCallback(() => setToastData(null), [])

  const setTableStatus = (id: number, status: TableStatus) =>
    setTables((ts) => ts.map((t) => (t.id === id ? { ...t, status } : t)))

  const [shift, setShift] = useState<Shift>({ open: false, opening: 0, name: 'Ca sáng', cashRevenue: 3200000, refunds: 50000 })
  const [invoices, setInvoices] = useState(initialInvoices)
  const [drafts, setDrafts] = useState(initialDrafts)
  const [members, setMembers] = useState(MEMBERS)

  const [wastes, setWastes] = useState(initialWastes)

  const [promos, setPromos] = useState(initialPromos)

  const [ingredients, setIngredients] = useState(INGREDIENTS)
  const [adjustments, setAdjustments] = useState(initialAdjustments)

  const store: Store = {
    ingredients,
    saveIngredient: (i) => setIngredients((xs) => (xs.some((x) => x.id === i.id) ? xs.map((x) => (x.id === i.id ? i : x)) : [...xs, i])),
    removeIngredient: (id) => setIngredients((xs) => xs.filter((x) => x.id !== id)),
    changeStock: (name, delta) => setIngredients((xs) => xs.map((x) => (x.name === name ? { ...x, stock: x.stock + delta } : x))),
    adjustments,
    addAdjustment: (a) => setAdjustments((xs) => [a, ...xs]),
    promos,
    savePromo: (p) => setPromos((xs) => (xs.some((x) => x.id === p.id) ? xs.map((x) => (x.id === p.id ? p : x)) : [...xs, p])),
    removePromo: (id) => setPromos((xs) => xs.filter((x) => x.id !== id)),
    wastes,
    addWaste: (w) => setWastes((xs) => [w, ...xs]),
    updateWaste: (id, patch) => setWastes((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x))),
    shift,
    setShift,
    invoices,
    addInvoice: (i) => setInvoices((xs) => [i, ...xs]),
    updateInvoice: (id, patch) => setInvoices((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x))),
    drafts,
    removeDraft: (id) => setDrafts((xs) => xs.filter((x) => x.id !== id)),
    addDraft: (d) => setDrafts((xs) => [...xs, d]),
    members,
    addMember: (m) => setMembers((xs) => [...xs, m]),
    tables,
    orders,
    notices,
    setTableStatus,
    addLines: (tableId, lines) => setOrders((o) => ({ ...o, [tableId]: [...(o[tableId] ?? []), ...lines] })),
    updateLine: (tableId, lineId, patch) =>
      setOrders((o) => ({ ...o, [tableId]: (o[tableId] ?? []).map((l) => (l.id === lineId ? { ...l, ...patch } : l)) })),
    removeLine: (tableId, lineId) => setOrders((o) => ({ ...o, [tableId]: (o[tableId] ?? []).filter((l) => l.id !== lineId) })),
    moveOrder: (from, to) => {
      setOrders((o) => {
        const next = { ...o, [to]: o[from] ?? [] }
        delete next[from]
        return next
      })
      setTables((ts) => {
        const fromStatus = ts.find((t) => t.id === from)!.status
        return ts.map((t) => (t.id === to ? { ...t, status: fromStatus } : t.id === from ? { ...t, status: 'free' } : t))
      })
    },
    clearTable: (id) => {
      setOrders((o) => {
        const next = { ...o }
        delete next[id]
        return next
      })
      setTableStatus(id, 'free')
    },
    markNoticesRead: () => setNotices((ns) => ns.map((n) => ({ ...n, read: true }))),
    toast: setToastData,
  }

  return (
    <Ctx.Provider value={store}>
      {children}
      <Toast toast={toastData} onClose={closeToast} />
    </Ctx.Provider>
  )
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore phải nằm trong StoreProvider')
  return s
}

export const money = (n: number) => n.toLocaleString('vi-VN') + 'đ'
export const nowHM = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
