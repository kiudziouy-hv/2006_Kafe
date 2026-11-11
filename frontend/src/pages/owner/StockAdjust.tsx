import { useState } from 'react'
import { Panel, Table } from '../../components/Table'
import { Button, Modal, Select, TextField } from '../../components/ui'
import { stamp, useStore } from '../../store'
import OwnerLayout from './OwnerLayout'
import { qtyFmt } from './Ingredients'

// S48 — Điều chỉnh tồn kho (kiểm kê); S48b — popup điều chỉnh; S48c — không được âm (BR-011)
export default function StockAdjust() {
  const { adjustments, addAdjustment, changeStock, ingredients, toast } = useStore()
  const [open, setOpen] = useState(false)

  return (
    <OwnerLayout title="Điều chỉnh tồn kho (kiểm kê)" right={<Button onClick={() => setOpen(true)}>+ Điều chỉnh tồn</Button>}>
      <Panel title="Lịch sử điều chỉnh (chỉ thêm, không sửa/xóa)">
        <Table
          rows={adjustments}
          rowKey={(r) => r.time + r.ingredient}
          cols={[
            { head: 'Thời điểm', cell: (r) => r.time },
            { head: 'Nguyên liệu', cell: (r) => r.ingredient },
            { head: 'Tồn trước', cell: (r) => r.before.toLocaleString('vi-VN'), className: 'text-right' },
            { head: 'Tồn sau', cell: (r) => r.after.toLocaleString('vi-VN'), className: 'text-right' },
            { head: 'Lý do', cell: (r) => r.reason },
            { head: 'Người thực hiện', cell: (r) => r.by },
          ]}
        />
      </Panel>
      {open && (
        <AdjustForm
          onClose={() => setOpen(false)}
          onDone={(name, counted, reason) => {
            const ing = ingredients.find((i) => i.name === name)!
            addAdjustment({ time: stamp(), ingredient: name, before: ing.stock, after: counted, reason, by: 'Chủ quán mẫu' })
            changeStock(name, counted - ing.stock)
            toast({ type: 'success', title: 'Đã điều chỉnh tồn kho', message: `${name}: ${qtyFmt(ing.stock, ing.unit)} → ${qtyFmt(counted, ing.unit)}` })
            setOpen(false)
          }}
        />
      )}
    </OwnerLayout>
  )
}

function AdjustForm({ onClose, onDone }: { onClose: () => void; onDone: (name: string, counted: number, reason: string) => void }) {
  const { ingredients, toast } = useStore()
  const [name, setName] = useState(ingredients[0].name)
  const [counted, setCounted] = useState('')
  const [reason, setReason] = useState('')
  const ing = ingredients.find((i) => i.name === name)!
  const n = counted === '' ? NaN : Number(counted)
  const negative = counted.trim().startsWith('-')
  const diff = Number.isNaN(n) ? null : n - ing.stock

  const submit = () => {
    if (negative || Number.isNaN(n) || n < 0) return toast({ type: 'error', title: 'Không thể điều chỉnh', message: 'Tồn kho sau điều chỉnh không được âm (BR-011).' })
    if (!reason.trim()) return toast({ type: 'error', title: 'Không thể điều chỉnh', message: 'Số kiểm kê không hợp lệ hoặc thiếu lý do.' })
    onDone(name, n, reason.trim())
  }

  return (
    <Modal title="Điều chỉnh tồn kho (kiểm kê)" onClose={onClose}>
      <Select label="Nguyên liệu" value={name} onChange={setName} options={ingredients.map((i) => i.name)} />
      <TextField label="Tồn kho hiện tại" value={qtyFmt(ing.stock, ing.unit)} disabled readOnly />
      <TextField
        label="Số lượng kiểm kê thực tế"
        inputMode="numeric"
        value={counted}
        error={negative ? 'Không được nhập số âm: tồn kho không thể nhỏ hơn 0 (BR-011).' : undefined}
        onChange={(e) => setCounted(e.target.value.replace(/[^\d-]/g, ''))}
      />
      <TextField label="Chênh lệch" value={diff == null ? '' : `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${qtyFmt(Math.abs(diff), ing.unit)}`} disabled readOnly />
      <TextField label="Lý do điều chỉnh (bắt buộc)" placeholder="Nhập nội dung..." value={reason} onChange={(e) => setReason(e.target.value)} />
      <div className="flex gap-2 [&>*]:flex-1">
        <Button variant="destructive-text" onClick={onClose}>
          Hủy
        </Button>
        <Button onClick={submit}>Xác nhận điều chỉnh</Button>
      </div>
    </Modal>
  )
}
