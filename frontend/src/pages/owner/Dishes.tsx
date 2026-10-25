import { useState } from 'react'
import ImagePicker from '../../components/ImagePicker'
import { Panel, RowMenu, SearchBox, Table } from '../../components/Table'
import { Badge, Button, Checkbox, Chip, ConfirmDialog, DialogOverlay, Modal, Select, TextField, Thumb } from '../../components/ui'
import { TOPPINGS, useStore } from '../../store'
import { usePersist } from '../../usePersist'
import OwnerLayout from './OwnerLayout'

type DishStatus = 'selling' | 'soldout-system' | 'soldout-manual' | 'stopped'
type Dish = { id: string; name: string; group: string; sizeM?: number; sizeL?: number; price?: number; status: DishStatus; hasSales: boolean; hot: boolean; cold: boolean; toppings: string[] }

export const DISH_STATUS: Record<DishStatus, { label: string; tone: 'success' | 'warning' | 'neutral' }> = {
  selling: { label: 'Đang bán', tone: 'success' },
  'soldout-system': { label: 'Hết hàng (hệ thống)', tone: 'warning' },
  'soldout-manual': { label: 'Hết hàng (thủ công)', tone: 'neutral' },
  stopped: { label: 'Ngừng bán', tone: 'neutral' },
}

const INITIAL: Dish[] = [
  { id: 'd1', name: 'Món mẫu 1', group: 'Coffee', sizeM: 35000, sizeL: 40000, status: 'selling', hasSales: true, hot: true, cold: true, toppings: ['tp1'] },
  { id: 'd2', name: 'Món mẫu 2 (chỉ size M, chỉ nóng)', group: 'Coffee', sizeM: 45000, status: 'soldout-system', hasSales: true, hot: true, cold: false, toppings: [] },
  { id: 'd3', name: 'Món mẫu 3', group: 'Tea', sizeM: 30000, sizeL: 35000, status: 'stopped', hasSales: true, hot: false, cold: true, toppings: ['tp3'] },
  ...[4, 5, 6, 7, 8, 9].map((i) => ({ id: `d${i}`, name: `Món mẫu ${i}`, group: 'Cake', price: 30000, status: 'selling' as DishStatus, hasSales: i < 6, hot: false, cold: false, toppings: [] })),
]
const GROUPS = ['Coffee', 'Tea', 'Smoothie', 'Cake']

// S42 — Danh sách món; S42c — menu ⋯; S43 — Thêm món; S43b — Sửa món
export default function Dishes() {
  const { toast } = useStore()
  const [dishes, setDishes] = usePersist('dishes', INITIAL)
  const [group, setGroup] = useState('all')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Dish | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Dish | null>(null)

  const rows = dishes.filter((d) => (group === 'all' || d.group === group) && (!q || d.name.toLowerCase().includes(q.toLowerCase())))
  const update = (d: Dish, patch: Partial<Dish>, title: string) => {
    setDishes((xs) => xs.map((x) => (x.id === d.id ? { ...x, ...patch } : x)))
    toast({ type: 'success', title, message: d.name })
  }

  return (
    <OwnerLayout title="Thực đơn">
      <div className="flex flex-wrap items-center gap-2">
        <Chip label="Tất cả" selected={group === 'all'} onClick={() => setGroup('all')} />
        {GROUPS.map((g) => (
          <Chip key={g} label={g} selected={group === g} onClick={() => setGroup(g)} />
        ))}
        <div className="ml-1 w-[194px]">
          <SearchBox value={q} onChange={setQ} />
        </div>
        <div className="ml-auto">
          <Button onClick={() => setEditing('new')}>+ Thêm món</Button>
        </div>
      </div>
      <Table
        rows={rows}
        rowKey={(r) => r.id}
        empty={q ? `Không tìm thấy món khớp «${q}».` : 'Chưa có món nào.'}
        cols={[
          { head: '', cell: () => <Thumb size="sm" />, className: 'w-14' },
          { head: 'Món', cell: (r) => r.name },
          { head: 'Nhóm', cell: (r) => r.group },
          { head: 'Kích thước & giá', cell: (r) => (r.price ? `${r.price.toLocaleString('vi-VN')}đ` : [r.sizeM && `M ${r.sizeM.toLocaleString('vi-VN')}đ`, r.sizeL && `L ${r.sizeL.toLocaleString('vi-VN')}đ`].filter(Boolean).join(' · ')) },
          { head: 'Trạng thái bán', cell: (r) => <Badge label={DISH_STATUS[r.status].label} tone={DISH_STATUS[r.status].tone} /> },
          {
            head: 'Thao tác',
            cell: (r) => (
              <RowMenu
                actions={[
                  { label: 'Sửa', onClick: () => setEditing(r) },
                  r.status === 'selling'
                    ? { label: 'Đặt hết hàng', onClick: () => update(r, { status: 'soldout-manual' }, 'Đã đặt hết hàng') }
                    : { label: 'Mở bán lại', onClick: () => update(r, { status: 'selling' }, 'Đã mở bán lại') },
                  r.status === 'stopped'
                    ? { label: 'Bán lại', onClick: () => update(r, { status: 'selling' }, 'Đã bán lại món') }
                    : { label: 'Ngừng bán', onClick: () => update(r, { status: 'stopped' }, 'Đã ngừng bán món') },
                  { label: r.hasSales ? 'Xóa (đã có giao dịch, không thể xóa)' : 'Xóa (chưa có giao dịch)', danger: true, disabled: r.hasSales, onClick: () => setDeleting(r) },
                ]}
              />
            ),
          },
        ]}
      />

      {editing && (
        <DishForm
          dish={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(d) => {
            setDishes((xs) => (xs.some((x) => x.id === d.id) ? xs.map((x) => (x.id === d.id ? d : x)) : [...xs, d]))
            toast({ type: 'success', title: editing === 'new' ? 'Đã lưu món' : 'Đã cập nhật món', message: d.name })
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <DialogOverlay onClose={() => setDeleting(null)}>
          <ConfirmDialog title={`Xóa ${deleting.name}?`} message="Món chưa có giao dịch sẽ bị xóa khỏi thực đơn.">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Không
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDishes((xs) => xs.filter((x) => x.id !== deleting.id))
                toast({ type: 'success', title: 'Đã xóa món', message: deleting.name })
                setDeleting(null)
              }}
            >
              Xóa
            </Button>
          </ConfirmDialog>
        </DialogOverlay>
      )}
    </OwnerLayout>
  )
}

const SUGAR = ['0%', '30%', '50%', '70%', '100%']
const ICE = ['Không đá', 'Ít đá', 'Bình thường']

function DishForm({ dish, onClose, onSave }: { dish: Dish | null; onClose: () => void; onSave: (d: Dish) => void }) {
  const { toast } = useStore()
  const [name, setName] = useState(dish?.name ?? '')
  const [group, setGroup] = useState(dish?.group ?? '')
  const [status, setStatus] = useState<DishStatus>(dish?.status ?? 'selling')
  const [m, setM] = useState({ on: dish ? !!dish.sizeM || !!dish.price : true, price: String(dish?.sizeM ?? dish?.price ?? 35000) })
  const [l, setL] = useState({ on: dish ? !!dish.sizeL : true, price: String(dish?.sizeL ?? 40000) })
  const [hot, setHot] = useState(dish?.hot ?? true)
  const [cold, setCold] = useState(dish?.cold ?? true)
  const [sugar, setSugar] = useState(SUGAR)
  const [ice, setIce] = useState(ICE)
  const [toppings, setToppings] = useState(dish?.toppings ?? ['tp1'])
  const isCake = group === 'Cake'

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const save = () => {
    if (!name.trim() || !group || (!m.on && !l.on) || (m.on && !Number(m.price)) || (l.on && !Number(l.price))) {
      toast({ type: 'error', title: 'Không thể lưu món', message: 'Thiếu tên, nhóm món hoặc giá bán.' })
      return
    }
    onSave({
      id: dish?.id ?? `d${Date.now()}`,
      name: name.trim(),
      group,
      status,
      hasSales: dish?.hasSales ?? false,
      hot,
      cold,
      toppings,
      ...(isCake ? { price: Number(m.price) } : { sizeM: m.on ? Number(m.price) : undefined, sizeL: l.on ? Number(l.price) : undefined }),
    })
  }

  return (
    <Modal title={dish ? 'Sửa món' : 'Thêm món'} onClose={onClose}>
      <h3 className="text-base font-semibold">Thông tin món</h3>
      <ImagePicker label="Ảnh món (minh họa)" />
      <TextField label="Tên món" placeholder="Nhập nội dung..." value={name} onChange={(e) => setName(e.target.value)} />
      <div className="flex gap-3">
        <Select label="Nhóm món" value={group} placeholder="Coffee / Tea / Smoothie / Cake" onChange={setGroup} options={GROUPS} />
        <Select
          label="Trạng thái bán"
          value={status}
          onChange={(v) => setStatus(v as DishStatus)}
          options={[
            { value: 'selling', label: 'Đang bán' },
            { value: 'soldout-manual', label: 'Hết hàng (thủ công)' },
            { value: 'stopped', label: 'Ngừng bán' },
          ]}
        />
      </div>
      <h3 className="text-sm font-semibold">{isCake ? 'Giá bán' : 'Kích thước và giá bán'}</h3>
      {isCake ? (
        <TextField label="Giá (đ)" inputMode="numeric" value={m.price} onChange={(e) => setM({ ...m, price: e.target.value.replace(/\D/g, '') })} />
      ) : (
        <div className="flex items-end gap-3">
          <div className="pb-3">
            <Checkbox label="Size M" checked={m.on} onChange={(on) => setM({ ...m, on })} />
          </div>
          <TextField label="Giá (đ)" inputMode="numeric" disabled={!m.on} value={m.price} onChange={(e) => setM({ ...m, price: e.target.value.replace(/\D/g, '') })} />
          <div className="pb-3">
            <Checkbox label="Size L" checked={l.on} onChange={(on) => setL({ ...l, on })} />
          </div>
          <TextField label="Giá (đ)" inputMode="numeric" disabled={!l.on} value={l.price} onChange={(e) => setL({ ...l, price: e.target.value.replace(/\D/g, '') })} />
        </div>
      )}
      {!isCake && (
        <>
          <h3 className="text-base font-semibold">Tùy chọn đồ uống</h3>
          <p className="text-sm font-semibold">Cách phục vụ</p>
          <div className="flex gap-4">
            <Checkbox label="Nóng (chỉ phục vụ tại quán)" checked={hot} onChange={setHot} />
            <Checkbox label="Lạnh" checked={cold} onChange={setCold} />
          </div>
          <p className="text-sm font-semibold">Mức đường áp dụng</p>
          <div className="flex flex-wrap gap-2">
            {SUGAR.map((s) => (
              <Chip key={s} label={s} selected={sugar.includes(s)} onClick={() => toggle(sugar, setSugar, s)} />
            ))}
          </div>
          {cold && (
            <>
              <p className="text-sm font-semibold">Mức đá áp dụng (đồ uống lạnh)</p>
              <div className="flex flex-wrap gap-2">
                {ICE.map((s) => (
                  <Chip key={s} label={s} selected={ice.includes(s)} onClick={() => toggle(ice, setIce, s)} />
                ))}
              </div>
            </>
          )}
          <p className="text-sm font-semibold">Topping được phép dùng</p>
          <div className="flex flex-wrap gap-4">
            {TOPPINGS.map((t) => (
              <Checkbox key={t.id} label={t.name} checked={toppings.includes(t.id)} onChange={() => toggle(toppings, setToppings, t.id)} />
            ))}
          </div>
        </>
      )}
      <div className="flex gap-2 [&>*]:flex-1">
        <Button variant="destructive-text" onClick={onClose}>
          Hủy
        </Button>
        <Button onClick={save}>{dish ? 'Lưu thay đổi' : 'Lưu món'}</Button>
      </div>
    </Modal>
  )
}
