import { useState } from 'react'
import { Button, Modal, Select, TextField } from './ui'
import { useStore, type Waste } from '../store'

export const WASTE_REASONS = ['Hết hạn', 'Hư hỏng', 'Đổ vỡ', 'Khác']

type Props = {
  title: string
  submitLabel: string
  note: string
  by: string
  status: Waste['status']
  initialIngredient?: string
  onClose: () => void
  onDone: (w: Waste) => void
}

// S31 — Lập phiếu đề xuất hao hụt (Pha chế); S49b / S50c — Chủ quán tự lập phiếu hao hụt
export default function WasteForm({ title, submitLabel, note, by, status, initialIngredient = '', onClose, onDone }: Props) {
  const { toast, wastes, ingredients } = useStore()
  const [ingredient, setIngredient] = useState(initialIngredient)
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('Hết hạn')
  const [text, setText] = useState('')
  const unit = ingredients.find((i) => i.name === ingredient)?.unit ?? ''

  const submit = () => {
    const n = Number(qty)
    if (!ingredient || !n || n <= 0 || !reason) {
      toast({ type: 'error', title: 'Không thể lưu phiếu', message: 'Thiếu nguyên liệu, số lượng hoặc lý do.' })
      return
    }
    const now = new Date()
    onDone({
      id: `HH-${String(wastes.length + 1).padStart(3, '0')}`,
      date: `${now.getDate()}/${now.getMonth() + 1} ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
      ingredient, qty: n, unit, reason, note: text, by, status,
    })
  }

  return (
    <Modal title={title} onClose={onClose}>
      <Select label="Nguyên liệu" value={ingredient} placeholder="Chọn nguyên liệu" onChange={setIngredient} options={ingredients.map((i) => i.name)} />
      <div className="flex gap-3">
        <div className="flex-1">
          <TextField label="Số lượng" inputMode="decimal" placeholder="500" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d.]/g, ''))} />
        </div>
        <div className="flex-1">
          <TextField label="Đơn vị" value={unit} placeholder="ml" disabled readOnly />
        </div>
      </div>
      <Select label="Lý do" value={reason} onChange={setReason} options={WASTE_REASONS} hint={reason === 'Hết hạn' ? 'Hết hạn: nhập số lượng theo kiểm đếm thực tế.' : undefined} />
      <TextField label="Ghi chú" placeholder="Nhập nội dung..." value={text} onChange={(e) => setText(e.target.value)} />
      <p className="text-xs text-text-secondary">{note}</p>
      <div className="flex gap-2 [&>*]:flex-1">
        <Button variant="destructive-text" onClick={onClose}>
          Hủy
        </Button>
        <Button onClick={submit}>{submitLabel}</Button>
      </div>
    </Modal>
  )
}
