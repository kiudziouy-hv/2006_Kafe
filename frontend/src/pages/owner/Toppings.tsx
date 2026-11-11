import { useState } from 'react'
import ImagePicker from '../../components/ImagePicker'
import { RowMenu, SearchBox, Table } from '../../components/Table'
import { Badge, Button, ConfirmDialog, DialogOverlay, Modal, Select, TextField, Thumb } from '../../components/ui'
import { useStore } from '../../store'
import { usePersist } from '../../usePersist'
import OwnerLayout from './OwnerLayout'
import { DISH_STATUS } from './Dishes'

type Status = 'selling' | 'soldout-system' | 'soldout-manual' | 'stopped'
type Topping = { id: string; name: string; price: number; allowed: string; status: Status; hasSales: boolean }

const INITIAL: Topping[] = [
  { id: 'tp1', name: 'Topping mẫu 1', price: 5000, allowed: 'Coffee, Tea', status: 'selling', hasSales: true },
  { id: 'tp2', name: 'Topping mẫu 2', price: 7000, allowed: 'Smoothie', status: 'soldout-system', hasSales: true },
  { id: 'tp3', name: 'Topping mẫu 3', price: 5000, allowed: 'Tea', status: 'soldout-manual', hasSales: false },
]
const ALLOWED = ['Coffee', 'Tea', 'Smoothie', 'Coffee, Tea', 'Coffee, Tea, Smoothie']

// S44 — Danh mục topping; S44b — Thêm; S44c — menu ⋯; S44d — Sửa
export default function Toppings() {
  const { toast } = useStore()
  const [items, setItems] = usePersist('toppings', INITIAL)
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Topping | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Topping | null>(null)
  const rows = items.filter((t) => !q || t.name.toLowerCase().includes(q.toLowerCase()))
  const update = (t: Topping, patch: Partial<Topping>, title: string) => {
    setItems((xs) => xs.map((x) => (x.id === t.id ? { ...x, ...patch } : x)))
    toast({ type: 'success', title, message: t.name })
  }

  return (
    <OwnerLayout title="Topping">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <SearchBox value={q} onChange={setQ} />
        </div>
        <Button onClick={() => setEditing('new')}>+ Thêm topping</Button>
      </div>
      <Table
        rows={rows}
        rowKey={(r) => r.id}
        empty={q ? `Không tìm thấy topping khớp «${q}».` : 'Chưa có topping.'}
        cols={[
          { head: '', cell: () => <Thumb size="sm" />, className: 'w-14' },
          { head: 'Topping', cell: (r) => r.name },
          { head: 'Phụ phí', cell: (r) => `+${r.price.toLocaleString('vi-VN')}đ`, className: 'text-right' },
          { head: 'Món được dùng', cell: (r) => r.allowed },
          { head: 'Trạng thái', cell: (r) => <Badge label={DISH_STATUS[r.status].label} tone={DISH_STATUS[r.status].tone} /> },
          {
            head: 'Thao tác',
            cell: (r) => (
              <RowMenu
                actions={[
                  { label: 'Sửa', onClick: () => setEditing(r) },
                  r.status === 'selling'
                    ? { label: 'Đặt hết hàng', onClick: () => update(r, { status: 'soldout-manual' }, 'Đã cập nhật topping') }
                    : { label: 'Mở bán lại', onClick: () => update(r, { status: 'selling' }, 'Đã cập nhật topping') },
                  { label: 'Ngừng bán', disabled: r.status === 'stopped', onClick: () => update(r, { status: 'stopped' }, 'Đã cập nhật topping') },
                  { label: r.hasSales ? 'Xóa (đã có giao dịch, không thể xóa)' : 'Xóa (chưa có giao dịch)', danger: true, disabled: r.hasSales, onClick: () => setDeleting(r) },
                ]}
              />
            ),
          },
        ]}
      />

      {editing && (
        <ToppingForm
          topping={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(t) => {
            setItems((xs) => (xs.some((x) => x.id === t.id) ? xs.map((x) => (x.id === t.id ? t : x)) : [...xs, t]))
            toast({ type: 'success', title: editing === 'new' ? 'Đã lưu topping' : 'Đã cập nhật topping', message: t.name })
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <DialogOverlay onClose={() => setDeleting(null)}>
          <ConfirmDialog title={`Xóa ${deleting.name}?`} message="Topping chưa có giao dịch sẽ bị xóa.">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Không
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setItems((xs) => xs.filter((x) => x.id !== deleting.id))
                toast({ type: 'success', title: 'Đã xóa topping', message: deleting.name })
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

function ToppingForm({ topping, onClose, onSave }: { topping: Topping | null; onClose: () => void; onSave: (t: Topping) => void }) {
  const { toast } = useStore()
  const [name, setName] = useState(topping?.name ?? '')
  const [price, setPrice] = useState(String(topping?.price ?? 0))
  const [allowed, setAllowed] = useState(topping?.allowed ?? '')
  const [status, setStatus] = useState<Status>(topping?.status ?? 'selling')

  const save = () => {
    if (!name.trim() || !Number(price) || !allowed) {
      toast({ type: 'error', title: 'Không thể lưu topping', message: 'Thiếu tên, phụ phí hoặc món được phép dùng.' })
      return
    }
    onSave({ id: topping?.id ?? `tp${Date.now()}`, name: name.trim(), price: Number(price), allowed, status, hasSales: topping?.hasSales ?? false })
  }

  return (
    <Modal title={topping ? 'Sửa topping' : 'Thêm topping'} onClose={onClose}>
      <ImagePicker label="Ảnh topping (minh họa)" />
      <TextField label="Tên topping" placeholder="Nhập nội dung..." value={name} onChange={(e) => setName(e.target.value)} />
      <TextField label="Phụ phí (đ)" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} />
      <Select label="Món được phép dùng" value={allowed} placeholder="Chọn nhóm / món..." onChange={setAllowed} options={ALLOWED} />
      <Select
        label="Trạng thái"
        value={status}
        onChange={(v) => setStatus(v as Status)}
        options={[
          { value: 'selling', label: 'Đang bán' },
          { value: 'soldout-manual', label: 'Hết hàng (thủ công)' },
          { value: 'stopped', label: 'Ngừng bán' },
        ]}
      />
      <div className="flex gap-2 pt-2 [&>*]:flex-1">
        <Button variant="destructive-text" onClick={onClose}>
          Hủy
        </Button>
        <Button onClick={save}>Lưu</Button>
      </div>
    </Modal>
  )
}
