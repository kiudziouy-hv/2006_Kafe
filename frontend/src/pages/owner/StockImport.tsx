import { useState } from 'react'
import { Panel, RowMenu, Table } from '../../components/Table'
import { Button, Modal, Select, TextField, DateField } from '../../components/ui'
import { useStore } from '../../store'
import OwnerLayout from './OwnerLayout'
import { qtyFmt } from './Ingredients'

type Line = { id: string; ingredient: string; qty: number; expiry?: string }

const fmtDate = (s?: string) => (s ? s.split('-').reverse().join('/') : '')

// S47 — Lập phiếu nhập kho; S47b — Thêm dòng nhập
export default function StockImport() {
  const { ingredients, changeStock, toast } = useStore()
  const [lines, setLines] = useState<Line[]>([
    { id: 'a', ingredient: 'Nguyên liệu mẫu 1', qty: 5000 },
    { id: 'b', ingredient: 'Sữa tươi', qty: 10000, expiry: '2026-10-25' },
    { id: 'c', ingredient: 'Bánh mẫu 1', qty: 24 },
  ])
  const [focus, setFocus] = useState<string | null>('c')
  const [adding, setAdding] = useState<Line | 'new' | null>(null)
  const ing = (n: string) => ingredients.find((i) => i.name === n)
  const needsExpiry = (l: Line) => ing(l.ingredient)?.trackExpiry && !l.expiry
  const focused = lines.find((l) => l.id === focus && ing(l.ingredient)?.trackExpiry)

  const confirm = () => {
    if (!lines.length) return toast({ type: 'error', title: 'Không lưu được phiếu nhập', message: 'Phiếu chưa có dòng nào.' })
    const missing = lines.find(needsExpiry)
    if (missing) {
      setFocus(missing.id)
      return toast({ type: 'error', title: 'Thiếu hạn sử dụng', message: 'Sữa tươi và bánh cần có hạn sử dụng.' })
    }
    lines.forEach((l) => changeStock(l.ingredient, l.qty))
    toast({ type: 'success', title: 'Đã lưu phiếu nhập kho', message: `${lines.length} dòng đã cộng vào tồn kho.` })
    setLines([])
  }

  return (
    <OwnerLayout title="Phiếu nhập kho">
      <Panel title="Các dòng nhập" right={<Button variant="secondary" onClick={() => setAdding('new')}>+ Thêm nguyên liệu</Button>}>
        <Table
          rows={lines}
          rowKey={(r) => r.id}
          onRowClick={(r) => setFocus(r.id)}
          selectedKey={focus ?? undefined}
          empty="Chưa có dòng nhập nào."
          cols={[
            { head: 'Nguyên liệu', cell: (r) => r.ingredient },
            { head: 'Số lượng nhập', cell: (r) => qtyFmt(r.qty, ing(r.ingredient)?.unit ?? ''), className: 'text-right' },
            { head: 'Hạn sử dụng', cell: (r) => (ing(r.ingredient)?.trackExpiry ? (r.expiry ? fmtDate(r.expiry) : <span className="text-action-destructive">(chưa nhập)</span>) : 'Không yêu cầu') },
            {
              head: 'Thao tác',
              cell: (r) => (
                <RowMenu
                  actions={[
                    { label: 'Sửa', onClick: () => setAdding(r) },
                    { label: 'Xóa dòng', danger: true, onClick: () => setLines(lines.filter((l) => l !== r)) },
                  ]}
                />
              ),
            },
          ]}
        />
      </Panel>
      {focused && (
        <Panel title={`Hạn sử dụng — ${focused.ingredient}`}>
          <DateField
            label="Hạn sử dụng"
            value={focused.expiry ?? ''}
            error={!focused.expiry ? 'Bắt buộc với sữa tươi và bánh.' : undefined}
            onChange={(v) => setLines(lines.map((l) => (l.id === focused.id ? { ...l, expiry: v } : l)))}
          />
        </Panel>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="destructive-text" onClick={() => setLines([])}>
          Hủy
        </Button>
        <Button onClick={confirm}>Xác nhận phiếu nhập</Button>
      </div>

      {adding && (
        <LineForm
          line={adding === 'new' ? null : adding}
          onClose={() => setAdding(null)}
          onSave={(l) => {
            setLines(adding === 'new' ? [...lines, l] : lines.map((x) => (x === adding ? l : x)))
            toast({ type: 'success', title: 'Đã thêm dòng nhập', message: l.ingredient })
            setAdding(null)
          }}
        />
      )}
    </OwnerLayout>
  )
}

function LineForm({ line, onClose, onSave }: { line: Line | null; onClose: () => void; onSave: (l: Line) => void }) {
  const { ingredients, toast } = useStore()
  const [ingredient, setIngredient] = useState(line?.ingredient ?? '')
  const [qty, setQty] = useState(line ? String(line.qty) : '')
  const [expiry, setExpiry] = useState(line?.expiry ?? '')
  const track = ingredients.find((i) => i.name === ingredient)?.trackExpiry

  const save = () => {
    if (!ingredient || !(Number(qty) > 0)) return toast({ type: 'error', title: 'Không lưu được phiếu nhập', message: 'Chọn nguyên liệu và nhập số lượng lớn hơn 0.' })
    if (track && !expiry) return toast({ type: 'error', title: 'Thiếu hạn sử dụng', message: 'Sữa tươi và bánh cần có hạn sử dụng.' })
    onSave({ id: line?.id ?? String(Date.now()), ingredient, qty: Number(qty), expiry: track ? expiry : undefined })
  }

  return (
    <Modal title="Thêm dòng nhập" onClose={onClose}>
      <Select label="Nguyên liệu" value={ingredient} placeholder="Chọn nguyên liệu..." onChange={setIngredient} options={ingredients.map((i) => i.name)} />
      <TextField label="Số lượng nhập" inputMode="numeric" placeholder="20" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))} />
      {track && <DateField label="Hạn sử dụng" value={expiry} error={!expiry ? 'Bắt buộc với sữa tươi và bánh.' : undefined} onChange={setExpiry} />}
      <div className="flex gap-2 [&>*]:flex-1">
        <Button variant="destructive-text" onClick={onClose}>
          Hủy
        </Button>
        <Button onClick={save}>Thêm dòng nhập</Button>
      </div>
    </Modal>
  )
}
