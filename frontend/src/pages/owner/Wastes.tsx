import { useState } from 'react'
import { SearchBox, Table } from '../../components/Table'
import WasteForm from '../../components/WasteForm'
import { Badge, Button, Chip, Modal, TextField } from '../../components/ui'
import { useStore, type Waste } from '../../store'
import OwnerLayout from './OwnerLayout'

const STATUS = { proposed: { label: 'Đề xuất', tone: 'success' as const }, confirmed: { label: 'Đã xác nhận', tone: 'neutral' as const }, rejected: { label: 'Từ chối', tone: 'error' as const } }

// S49 — Phiếu hao hụt; S49b — Tự lập phiếu; S49c — Xác nhận; S49d — Từ chối
export default function Wastes() {
  const { wastes, updateWaste, addWaste, ingredients, changeStock, toast } = useStore()
  const [tab, setTab] = useState<'pending' | 'done'>('pending')
  const [q, setQ] = useState('')
  const [confirming, setConfirming] = useState<Waste | null>(null)
  const [rejecting, setRejecting] = useState<Waste | null>(null)
  const [creating, setCreating] = useState(false)
  const [reason, setReason] = useState('')

  const pending = wastes.filter((w) => w.status === 'proposed')
  const rows = wastes.filter((w) => (tab === 'pending' ? w.status === 'proposed' : w.status !== 'proposed') && (!q || w.ingredient.toLowerCase().includes(q.toLowerCase())))

  const doConfirm = (w: Waste) => {
    const ing = ingredients.find((i) => i.name === w.ingredient)
    if (ing && w.qty > ing.stock) {
      toast({ type: 'error', title: 'Không thể xác nhận', message: 'Số lượng hao hụt lớn hơn tồn kho.' })
      return setConfirming(null)
    }
    updateWaste(w.id, { status: 'confirmed' })
    changeStock(w.ingredient, -w.qty)
    toast({ type: 'success', title: 'Đã xác nhận phiếu hao hụt', message: `Kho đã trừ ${w.qty} ${w.unit} ${w.ingredient}.` })
    setConfirming(null)
  }

  return (
    <OwnerLayout title="Phiếu hao hụt">
      <div className="flex flex-wrap items-center gap-2">
        <Chip label={`Chờ xác nhận (${pending.length})`} selected={tab === 'pending'} onClick={() => setTab('pending')} />
        <Chip label="Đã xử lý" selected={tab === 'done'} onClick={() => setTab('done')} />
        <SearchBox value={q} onChange={setQ} />
        <div className="ml-auto">
          <Button onClick={() => setCreating(true)}>+ Tự lập phiếu</Button>
        </div>
      </div>
      <Table
        rows={rows}
        rowKey={(r) => r.id}
        empty={q ? `Không tìm thấy phiếu khớp «${q}».` : tab === 'pending' ? 'Không có phiếu chờ xác nhận.' : 'Chưa có phiếu đã xử lý.'}
        cols={[
          { head: 'Nguyên liệu', cell: (r) => r.ingredient },
          { head: 'Số lượng', cell: (r) => `${r.qty.toLocaleString('vi-VN')} ${r.unit}`, className: 'text-right' },
          { head: 'Lý do', cell: (r) => r.reason },
          { head: 'Người lập', cell: (r) => r.by },
          { head: 'Thời gian lập', cell: (r) => r.date },
          { head: 'Trạng thái', cell: (r) => <Badge label={STATUS[r.status].label} tone={STATUS[r.status].tone} /> },
          {
            head: tab === 'pending' ? 'Thao tác' : 'Ghi chú',
            cell: (r) =>
              r.status === 'proposed' ? (
                <div className="flex gap-1">
                  <Button onClick={() => setConfirming(r)}>Xác nhận</Button>
                  <Button variant="secondary" onClick={() => { setReason(''); setRejecting(r) }}>
                    Từ chối
                  </Button>
                </div>
              ) : (
                <span className="text-xs text-text-secondary">{r.rejectReason ?? r.note}</span>
              ),
          },
        ]}
      />

      {confirming && (
        <Modal title="Xác nhận phiếu hao hụt?" onClose={() => setConfirming(null)}>
          <p className="text-xs text-text-secondary">
            Phiếu: {confirming.ingredient}, {confirming.qty} {confirming.unit}, lý do {confirming.reason}. Kho sẽ bị trừ {confirming.qty} {confirming.unit} sau khi xác nhận.
          </p>
          <div className="flex gap-2 [&>*]:flex-1">
            <Button variant="destructive-text" onClick={() => setConfirming(null)}>
              Hủy
            </Button>
            <Button onClick={() => doConfirm(confirming)}>Xác nhận phiếu</Button>
          </div>
        </Modal>
      )}
      {rejecting && (
        <Modal title="Từ chối phiếu hao hụt" onClose={() => setRejecting(null)}>
          <p className="text-xs text-text-secondary">Phiếu giữ nguyên, kho không bị trừ. Pha chế sẽ thấy lý do từ chối.</p>
          <TextField label="Lý do từ chối (bắt buộc)" placeholder="Nhập lý do..." value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-2 [&>*]:flex-1">
            <Button variant="destructive-text" onClick={() => setRejecting(null)}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                if (!reason.trim()) return toast({ type: 'error', title: 'Không thể từ chối', message: 'Bắt buộc nhập lý do từ chối.' })
                updateWaste(rejecting.id, { status: 'rejected', rejectReason: reason.trim() })
                toast({ type: 'success', title: 'Đã từ chối phiếu', message: rejecting.ingredient })
                setRejecting(null)
              }}
            >
              Từ chối phiếu
            </Button>
          </div>
        </Modal>
      )}
      {creating && (
        <WasteForm
          title="Tự lập phiếu hao hụt"
          submitLabel="Lập phiếu"
          by="Chủ quán mẫu"
          status="confirmed"
          note="Phiếu do Chủ quán lập được xác nhận ngay; kho bị trừ khi lưu."
          onClose={() => setCreating(false)}
          onDone={(w) => {
            addWaste(w)
            changeStock(w.ingredient, -w.qty)
            setCreating(false)
            toast({ type: 'success', title: 'Đã lập phiếu hao hụt', message: `${w.ingredient} · ${w.qty} ${w.unit}` })
          }}
        />
      )}
    </OwnerLayout>
  )
}
