import { Button, DialogOverlay, IconButton } from './ui'
import { money, type Invoice } from '../store'
import iconClose from '../assets/icons/close.svg'

type Props = { invoice: Invoice; reprint?: boolean; onClose: () => void; onPrint: () => void; title?: string }

// S27 / S29b / S55c — Xem trước hóa đơn 80 mm
export default function ReceiptDialog({ invoice, reprint, onClose, onPrint, title = 'Hóa đơn' }: Props) {
  const n = (v: number) => v.toLocaleString('vi-VN')
  return (
    <DialogOverlay onClose={onClose}>
      <div className="mx-auto flex max-w-[340px] flex-col gap-4 rounded-[28px] border border-glass-stroke bg-[#f5eee2] p-6 shadow-[0_20px_48px_-8px_rgba(47,24,5,0.28)]">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{title}</h2>
          <IconButton icon={iconClose} label="Đóng" size="sm" onClick={onClose} />
        </div>
        <div className="max-h-[60vh] overflow-y-auto border border-border-default bg-[#fffdf8] px-3 py-4 text-[11px]">
          <p className="text-center text-base font-bold">2006 KAFÉ</p>
          <p className="text-center text-xs font-semibold">HÓA ĐƠN BÁN HÀNG</p>
          <p className="text-center text-[10px] text-text-secondary">
            {invoice.id} · {invoice.time}
          </p>
          <p className="mb-3 text-center text-[10px] text-text-secondary">{invoice.kind} · Thu ngân mẫu B</p>
          {invoice.lines.map((l, i) => (
            <Row key={i} label={`${l.qty}× ${l.name}`} value={n(l.amount)} />
          ))}
          <Row label="Khuyến mãi" value={`−${n(invoice.discount)}`} />
          <Row label={`Điểm sử dụng (${invoice.pointsUsed})`} value={`−${n(invoice.pointsUsed * 1000)}`} />
          <Row label="Làm tròn" value="0" />
          <div className="my-2 h-px bg-border-strong" />
          <div className="flex justify-between py-1 text-xs font-bold">
            <span>KHÁCH TRẢ</span>
            <span className="text-sm">{n(invoice.total)}</span>
          </div>
          <Row label={invoice.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản/QR'} value={n(invoice.total)} />
          <Row label="Điểm tích lũy mới" value={`+${invoice.pointsEarned}`} />
          <p className="mt-2 text-center text-[9px] text-text-secondary">Giá đã bao gồm thuế</p>
          {reprint && <p className="text-center text-[9px] font-semibold">★ BẢN IN LẠI ★</p>}
          {invoice.cancelled && <p className="text-center text-[9px] font-semibold text-action-destructive">★ HÓA ĐƠN ĐÃ HỦY ★</p>}
        </div>
        <div className="flex gap-2 [&>*]:flex-1">
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
          <Button onClick={onPrint}>{reprint ? 'In lại' : 'In hóa đơn'}</Button>
        </div>
      </div>
    </DialogOverlay>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1.5">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

export { money }
