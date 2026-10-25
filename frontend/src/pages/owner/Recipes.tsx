import { useState } from 'react'
import { Panel, RowMenu, Table } from '../../components/Table'
import { Button, Chip, Modal, Select, TextField } from '../../components/ui'
import { MENU, TOPPINGS, useStore } from '../../store'
import { usePersist } from '../../usePersist'
import OwnerLayout from './OwnerLayout'

type Line = { ingredient: string; qty: number }

const INITIAL: Record<string, Line[]> = {
  'Món mẫu 1 · M': [
    { ingredient: 'Nguyên liệu mẫu 1', qty: 18 },
    { ingredient: 'Sữa tươi', qty: 120 },
    { ingredient: 'Ly nhựa mẫu', qty: 1 },
    { ingredient: 'Nắp mẫu', qty: 1 },
  ],
}

// S46 — Thiết lập công thức; S46b — Thêm nguyên liệu vào công thức; S46c — menu ⋯; S46d — Sửa lượng dùng
export default function Recipes() {
  const { ingredients, toast } = useStore()
  const [saved, setSaved] = usePersist('recipes', INITIAL)
  const [kind, setKind] = useState<'dish' | 'topping'>('dish')
  const [dish, setDish] = useState('Món mẫu 1')
  const [size, setSize] = useState('M')
  const [topping, setTopping] = useState(TOPPINGS[0].name)
  const key = kind === 'dish' ? `${dish} · ${size}` : topping
  const [lines, setLines] = useState<Line[]>(saved[key] ?? [])
  const [editing, setEditing] = useState<Line | 'new' | null>(null)

  const switchTo = (k: string) => setLines(saved[k] ?? [])
  const unitOf = (n: string) => ingredients.find((i) => i.name === n)?.unit ?? ''

  const save = () => {
    if (!lines.length || lines.some((l) => !(l.qty > 0))) {
      toast({ type: 'error', title: 'Không thể lưu công thức', message: 'Nguyên liệu hoặc lượng không hợp lệ.' })
      return
    }
    setSaved({ ...saved, [key]: lines })
    toast({ type: 'success', title: 'Đã lưu công thức', message: key })
  }

  return (
    <OwnerLayout title="Công thức pha chế">
      <Panel title="Chọn đối tượng">
        <div className="flex gap-2">
          <Chip label="Món × kích thước" selected={kind === 'dish'} onClick={() => { setKind('dish'); switchTo(`${dish} · ${size}`) }} />
          <Chip label="Topping" selected={kind === 'topping'} onClick={() => { setKind('topping'); switchTo(topping) }} />
        </div>
        {kind === 'dish' ? (
          <div className="flex gap-3">
            <Select label="Món" value={dish} onChange={(v) => { setDish(v); switchTo(`${v} · ${size}`) }} options={MENU.filter((m) => m.category !== 'Cake').map((m) => m.name)} />
            <Select label="Kích thước" value={size} onChange={(v) => { setSize(v); switchTo(`${dish} · ${v}`) }} options={['M', 'L']} />
          </div>
        ) : (
          <Select label="Topping" value={topping} onChange={(v) => { setTopping(v); switchTo(v) }} options={TOPPINGS.map((t) => t.name)} />
        )}
      </Panel>

      <Panel title={`Nguyên liệu và lượng dùng — ${key}`} right={<Button variant="secondary" onClick={() => setEditing('new')}>+ Thêm nguyên liệu</Button>}>
        <Table
          rows={lines}
          rowKey={(r) => r.ingredient}
          empty="Chưa có nguyên liệu nào trong công thức."
          cols={[
            { head: 'Nguyên liệu', cell: (r) => r.ingredient },
            { head: 'Lượng', cell: (r) => r.qty.toLocaleString('vi-VN'), className: 'text-right' },
            { head: 'Đơn vị', cell: (r) => unitOf(r.ingredient) },
            {
              head: 'Thao tác',
              cell: (r) => (
                <RowMenu
                  actions={[
                    { label: 'Sửa lượng dùng', onClick: () => setEditing(r) },
                    { label: 'Bỏ khỏi công thức', danger: true, onClick: () => setLines(lines.filter((l) => l !== r)) },
                  ]}
                />
              ),
            },
          ]}
        />
      </Panel>

      <div className="flex justify-end gap-2">
        <Button variant="destructive-text" onClick={() => switchTo(key)}>
          Hủy
        </Button>
        <Button onClick={save}>Lưu công thức</Button>
      </div>

      {editing && (
        <LineForm
          line={editing === 'new' ? null : editing}
          used={lines.map((l) => l.ingredient)}
          onClose={() => setEditing(null)}
          onSave={(l) => {
            if (!(l.qty > 0)) return toast({ type: 'error', title: 'Lượng dùng không hợp lệ', message: 'Lượng dùng phải lớn hơn 0.' })
            setLines(editing === 'new' ? [...lines, l] : lines.map((x) => (x === editing ? l : x)))
            toast({ type: 'success', title: editing === 'new' ? 'Đã thêm vào công thức' : 'Đã cập nhật công thức', message: l.ingredient })
            setEditing(null)
          }}
        />
      )}
    </OwnerLayout>
  )
}

function LineForm({ line, used, onClose, onSave }: { line: Line | null; used: string[]; onClose: () => void; onSave: (l: Line) => void }) {
  const { ingredients } = useStore()
  const [ingredient, setIngredient] = useState(line?.ingredient ?? '')
  const [qty, setQty] = useState(line ? String(line.qty) : '')
  const options = ingredients.filter((i) => i.name === line?.ingredient || !used.includes(i.name)).map((i) => i.name)
  return (
    <Modal title={line ? 'Sửa nguyên liệu trong công thức' : 'Thêm nguyên liệu vào công thức'} onClose={onClose}>
      <Select label="Nguyên liệu" value={ingredient} placeholder="Chọn nguyên liệu..." onChange={setIngredient} options={options} disabled={!!line} />
      <TextField label="Lượng dùng cho 1 phần (theo đơn vị nguyên liệu)" inputMode="decimal" placeholder="0" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d.]/g, ''))} />
      <div className="flex gap-2 [&>*]:flex-1">
        <Button variant="destructive-text" onClick={onClose}>
          Hủy
        </Button>
        <Button disabled={!ingredient} onClick={() => onSave({ ingredient, qty: Number(qty) })}>
          {line ? 'Lưu thay đổi' : 'Thêm vào công thức'}
        </Button>
      </div>
    </Modal>
  )
}
