import { useState } from 'react'
import { RowMenu, SearchBox, Table } from '../../components/Table'
import { Badge, Button, Checkbox, ConfirmDialog, DialogOverlay, Modal, Select, TextField } from '../../components/ui'
import { useStore, type Ingredient } from '../../store'
import OwnerLayout from './OwnerLayout'

const UNITS = ['g', 'ml', 'cái']
export const qtyFmt = (n: number, unit: string) => `${n.toLocaleString('vi-VN')}${unit === 'cái' ? ' cái' : ` ${unit}`}`

// S45 — Nguyên liệu và tồn kho; S45b — Thêm; S45c — menu ⋯; S45d — Sửa
export default function Ingredients() {
  const { ingredients, saveIngredient, removeIngredient, toast } = useStore()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Ingredient | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Ingredient | null>(null)
  const rows = ingredients.filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <OwnerLayout title="Nguyên liệu và tồn kho">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <SearchBox value={q} onChange={setQ} />
        </div>
        <Button onClick={() => setEditing('new')}>+ Thêm nguyên liệu</Button>
      </div>
      <Table
        rows={rows}
        rowKey={(r) => r.id}
        empty={q ? `Không tìm thấy nguyên liệu khớp «${q}».` : 'Chưa có nguyên liệu.'}
        cols={[
          { head: 'Nguyên liệu', cell: (r) => r.name },
          { head: 'Đơn vị', cell: (r) => r.unit },
          {
            head: 'Tồn hiện tại',
            className: 'text-right',
            cell: (r) => (r.stock < r.min ? <Badge label={`${r.stock.toLocaleString('vi-VN')} (thấp)`} tone="warning" /> : r.stock.toLocaleString('vi-VN')),
          },
          { head: 'Tồn tối thiểu', cell: (r) => r.min.toLocaleString('vi-VN'), className: 'text-right' },
          { head: 'Theo dõi HSD', cell: (r) => (r.trackExpiry ? 'Có (theo phiếu nhập)' : 'Không') },
          {
            head: 'Thao tác',
            cell: (r) => (
              <RowMenu
                actions={[
                  { label: 'Sửa', onClick: () => setEditing(r) },
                  { label: r.used ? 'Xóa (đang dùng trong công thức)' : 'Xóa', danger: true, disabled: r.used, onClick: () => setDeleting(r) },
                ]}
              />
            ),
          },
        ]}
      />

      {editing && (
        <IngredientForm
          item={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(i) => {
            saveIngredient(i)
            toast({ type: 'success', title: editing === 'new' ? 'Đã lưu nguyên liệu' : 'Đã cập nhật nguyên liệu', message: i.name })
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <DialogOverlay onClose={() => setDeleting(null)}>
          <ConfirmDialog title={`Xóa ${deleting.name}?`} message="Nguyên liệu chưa dùng trong công thức sẽ bị xóa khỏi kho.">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Không
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                removeIngredient(deleting.id)
                toast({ type: 'success', title: 'Đã xóa nguyên liệu', message: deleting.name })
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

function IngredientForm({ item, onClose, onSave }: { item: Ingredient | null; onClose: () => void; onSave: (i: Ingredient) => void }) {
  const { toast } = useStore()
  const [name, setName] = useState(item?.name ?? '')
  const [unit, setUnit] = useState(item?.unit ?? '')
  const [min, setMin] = useState(String(item?.min ?? 0))
  const [track, setTrack] = useState(item?.trackExpiry ?? false)

  const save = () => {
    if (!name.trim() || !unit || min === '') {
      toast({ type: 'error', title: 'Không thể lưu', message: 'Thiếu tên, đơn vị hoặc mức tối thiểu.' })
      return
    }
    onSave({ id: item?.id ?? `i${Date.now()}`, name: name.trim(), unit, min: Number(min), stock: item?.stock ?? 0, trackExpiry: track, used: item?.used })
  }

  return (
    <Modal title={item ? 'Sửa nguyên liệu' : 'Thêm nguyên liệu'} onClose={onClose}>
      <TextField label="Tên nguyên liệu" placeholder="Nhập nội dung..." value={name} onChange={(e) => setName(e.target.value)} />
      <Select label="Đơn vị tính" value={unit} placeholder="g / ml / cái..." onChange={setUnit} options={UNITS} disabled={!!item?.used} />
      <TextField label="Mức tồn tối thiểu" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} />
      <Checkbox label="Theo dõi hạn sử dụng (chỉ sữa tươi, bánh)" checked={track} onChange={setTrack} />
      <div className="flex gap-2 [&>*]:flex-1">
        <Button variant="destructive-text" onClick={onClose}>
          Hủy
        </Button>
        <Button onClick={save}>Lưu</Button>
      </div>
    </Modal>
  )
}
