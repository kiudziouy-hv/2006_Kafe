import { useMemo, useState } from 'react'
import ReceiptDialog from '../../components/Receipt'
import { Panel, SearchBox, Table } from '../../components/Table'
import { Badge, Button, Checkbox, Chip, Modal, TextField, DateField } from '../../components/ui'
import { money, useStore, type Invoice } from '../../store'
import OwnerLayout from './OwnerLayout'

type Filter = 'all' | 'paid' | 'cancelled'

// S55 — Danh sách hóa đơn; S55b — trống; S55c — xem trước in lại; S56 — Hủy hóa đơn; S57 — Hủy dòng món đơn mang đi
export default function Invoices() {
  const { invoices, updateInvoice, toast } = useStore()
  const [from, setFrom] = useState('2026-10-20')
  const [to, setTo] = useState('2026-10-20')
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<string | null>(invoices[1]?.id ?? null)
  const [dialog, setDialog] = useState<'cancel' | 'line' | 'print' | null>(null)

  const rows = useMemo(
    () =>
      invoices.filter(
        (i) =>
          (filter === 'all' || (filter === 'paid' ? !i.cancelled : i.cancelled)) &&
          (!q || `${i.id} ${i.kind}`.toLowerCase().includes(q.toLowerCase())) &&
          from <= to,
      ),
    [invoices, filter, q, from, to],
  )
  const inv = invoices.find((i) => i.id === selected)
  const takeaway = inv?.kind.startsWith('Mang đi')

  return (
    <OwnerLayout title="Hóa đơn">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-[272px]">
          <DateField label="Từ ngày" value={from} onChange={setFrom} />
        </div>
        <div className="w-[272px]">
          <DateField label="Đến ngày" value={to} error={from > to ? 'Ngày bắt đầu phải trước ngày kết thúc.' : undefined} onChange={setTo} />
        </div>
        <div className="flex gap-2 pb-0.5">
          <Chip label="Tất cả" selected={filter === 'all'} onClick={() => setFilter('all')} />
          <Chip label="Đã thanh toán" selected={filter === 'paid'} onClick={() => setFilter('paid')} />
          <Chip label="Đã hủy" selected={filter === 'cancelled'} onClick={() => setFilter('cancelled')} />
        </div>
      </div>

      <Panel>
        <SearchBox value={q} onChange={setQ} />
        <Table
          rows={rows}
          rowKey={(r) => r.id}
          selectedKey={selected ?? undefined}
          onRowClick={(r) => setSelected(r.id)}
          empty={q ? `Không tìm thấy hóa đơn khớp «${q}».` : 'Chưa có hóa đơn nào trong khoảng thời gian này.'}
          cols={[
            { head: 'Mã HĐ', cell: (r) => r.id },
            { head: 'Thời gian', cell: (r) => r.time },
            { head: 'Loại', cell: (r) => r.kind },
            { head: 'Số tiền', cell: (r) => money(r.total), className: 'text-right' },
            { head: 'Phương thức', cell: (r) => (r.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản/QR') },
            { head: 'Trạng thái', cell: (r) => (r.cancelled ? <Badge label="Đã hủy" tone="error" /> : <Badge label="Đã thanh toán" tone="success" />) },
          ]}
        />
      </Panel>

      {inv && (
        <Panel title={`Chi tiết ${inv.id}`}>
          {inv.lines.map((l, i) => (
            <div key={i} className="flex py-2 text-sm">
              <span className="flex-1">
                {l.qty}× {l.name} (giá chốt {money(l.amount / l.qty)})
              </span>
              <span>{money(l.amount)}</span>
            </div>
          ))}
          <div className="flex py-2 text-sm">
            <span className="flex-1">
              Điểm đã dùng: {inv.pointsUsed} · {inv.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản/QR'} · Ca sáng
            </span>
            <span>−{money(inv.pointsUsed * 1000)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setDialog('print')}>
              In lại
            </Button>
            {!inv.cancelled && (
              <Button variant="destructive" onClick={() => setDialog('cancel')}>
                Hủy hóa đơn
              </Button>
            )}
          </div>
          {!inv.cancelled && takeaway && (
            <Button variant="destructive-text" block onClick={() => setDialog('line')}>
              Hủy dòng món (đơn mang đi)
            </Button>
          )}
        </Panel>
      )}

      {dialog === 'print' && inv && (
        <ReceiptDialog
          invoice={inv}
          reprint
          title="Bản in lại hóa đơn"
          onClose={() => setDialog(null)}
          onPrint={() => {
            toast({ type: 'success', title: 'Đã in lại hóa đơn', message: inv.id })
            setDialog(null)
          }}
        />
      )}
      {dialog === 'cancel' && inv && <CancelInvoice inv={inv} onClose={() => setDialog(null)} onDone={() => { updateInvoice(inv.id, { cancelled: true }); setDialog(null) }} />}
      {dialog === 'line' && inv && <CancelLine inv={inv} onClose={() => setDialog(null)} />}
    </OwnerLayout>
  )
}

function CancelInvoice({ inv, onClose, onDone }: { inv: Invoice; onClose: () => void; onDone: () => void }) {
  const { toast } = useStore()
  const [reason, setReason] = useState('')
  const [refunded, setRefunded] = useState(false)
  const [err, setErr] = useState('')
  const confirm = () => {
    if (!reason.trim()) return setErr('Bắt buộc nhập lý do hủy.')
    if (!refunded) return setErr('Xác nhận đã hoàn tiền cho khách trước khi hủy.')
    toast({ type: 'success', title: 'Đã hủy hóa đơn', message: `${inv.id} chuyển sang Đã hủy, hoàn điểm và kho bánh.` })
    onDone()
  }
  return (
    <Modal title={`Hủy hóa đơn ${inv.id}`} onClose={onClose}>
      <TextField label="Lý do hủy (bắt buộc)" placeholder="Nhập nội dung..." value={reason} error={err && !reason.trim() ? err : undefined} onChange={(e) => setReason(e.target.value)} />
      <Checkbox label="Tôi đã hoàn tiền cho khách (thực hiện ngoài hệ thống)" checked={refunded} onChange={setRefunded} />
      {err && reason.trim() && <p className="text-xs text-action-destructive">{err}</p>}
      <div className="flex gap-2 [&>*]:flex-1">
        <Button variant="secondary" onClick={onClose}>
          Không hủy
        </Button>
        <Button variant="destructive" onClick={confirm}>
          Xác nhận hủy hóa đơn
        </Button>
      </div>
    </Modal>
  )
}

function CancelLine({ inv, onClose }: { inv: Invoice; onClose: () => void }) {
  const { toast } = useStore()
  const lines = [
    { id: 'a', label: '1× Món mẫu 1 · M · Lạnh — New', value: 35000, ok: true },
    { id: 'b', label: '2× Bánh mẫu 1 — Done', value: 60000, ok: false },
  ]
  const [pick, setPick] = useState('a')
  const [reason, setReason] = useState('')
  const [refunded, setRefunded] = useState(false)
  const line = lines.find((l) => l.id === pick)!
  const points = Math.floor((10 * line.value) / 95000)
  const refund = Math.floor((line.value - points * 1000) / 500) * 500

  const confirm = () => {
    if (!reason.trim() || !refunded) {
      toast({ type: 'error', title: 'Không thể hủy dòng món', message: !reason.trim() ? 'Bắt buộc nhập lý do hủy.' : 'Xác nhận đã hoàn tiền cho khách.' })
      return
    }
    toast({ type: 'success', title: 'Đã hủy dòng món', message: `${inv.id} · hoàn ${money(refund)} và ${points} điểm.` })
    onClose()
  }

  return (
    <Modal title={`Hủy dòng món · Đơn ${inv.kind.replace('Mang đi', 'mang đi')}`} onClose={onClose}>
      <p className="text-sm font-semibold">Chọn dòng món cần hủy (chỉ dòng New)</p>
      <div className="flex flex-col gap-2">
        {lines.map((l) => (
          <label key={l.id} className={`flex items-center gap-2 text-sm ${l.ok ? 'cursor-pointer' : 'cursor-not-allowed text-text-disabled'}`}>
            <input type="radio" name="line" disabled={!l.ok} checked={pick === l.id} onChange={() => setPick(l.id)} className="size-4 accent-action-primary" />
            {l.label}
          </label>
        ))}
      </div>
      <TextField label="Lý do hủy (bắt buộc)" placeholder="Nhập nội dung..." value={reason} onChange={(e) => setReason(e.target.value)} />
      <p className="text-sm font-semibold">Hoàn tiền một phần (tính tự động)</p>
      <div className="flex justify-between py-1 text-sm">
        <span>Giá trị dòng món sau khuyến mãi</span>
        <span>{money(line.value)}</span>
      </div>
      <div className="flex justify-between py-1 text-sm">
        <span>Điểm hoàn (10 × {line.value.toLocaleString('vi-VN')} / 95.000, làm tròn xuống)</span>
        <span>{points} điểm</span>
      </div>
      <div className="h-px bg-border-strong" />
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold">Tiền hoàn ({line.value.toLocaleString('vi-VN')} − {(points * 1000).toLocaleString('vi-VN')}, làm tròn 500đ)</span>
        <span className="text-xl font-bold">{money(refund)}</span>
      </div>
      <Checkbox label="Tôi đã trả tiền / hoàn tiền cho khách (ngoài hệ thống)" checked={refunded} onChange={setRefunded} />
      <div className="flex gap-2 [&>*]:flex-1">
        <Button variant="secondary" onClick={onClose}>
          Không hủy
        </Button>
        <Button variant="destructive" onClick={confirm}>
          Xác nhận hủy dòng món
        </Button>
      </div>
    </Modal>
  )
}
