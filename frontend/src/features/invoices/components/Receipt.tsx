import { formatDateTime, formatMoney, orderLabel } from '@/utils/format'
import type { InvoiceDetail } from '../api/invoicesApi'

const opt = (l: InvoiceDetail['lines'][number]) =>
  [
    l.size === 'M' || l.size === 'L' ? `Cỡ ${l.size}` : null,
    l.temperature === 'HOT' ? 'Nóng' : l.temperature === 'COLD' ? 'Lạnh' : null,
    l.ice === 'SEPARATE' ? 'Đá riêng' : null,
    ...l.toppings,
  ]
    .filter(Boolean)
    .join(', ')

/** Bản in hóa đơn khổ 80 mm (NFR-016). {@code reprint} thêm dấu "REPRINT" cho bản in lại. */
export function Receipt({ invoice, reprint }: { invoice: InvoiceDetail; reprint?: boolean }) {
  const lines = invoice.lines.filter((l) => l.status !== 'CANCELLED')
  return (
    <div className="print-area mx-auto w-[74mm] bg-[#fff] p-3 font-mono text-[12px] leading-snug text-black">
      <div className="text-center">
        <p className="font-display text-base font-semibold">2006 Kafé</p>
        <p>Hóa đơn bán hàng</p>
        {reprint && (
          <p className="my-1 border border-black px-2 font-bold tracking-widest">REPRINT</p>
        )}
        {invoice.status === 'CANCELLED' && <p className="font-bold">*** ĐÃ HỦY (CANCELLED) ***</p>}
      </div>
      <p className="mt-2">Số: {invoice.invoiceNo}</p>
      <p>Đơn: {orderLabel(invoice)}</p>
      <p>Giờ: {formatDateTime(invoice.issuedAt)}</p>
      <p>Thu ngân: {invoice.issuedBy}</p>
      {reprint && invoice.reprints.length > 0 && (
        <p>
          In lại lần {invoice.reprints.length}:{' '}
          {invoice.reprints[invoice.reprints.length - 1].reprintedBy},{' '}
          {formatDateTime(invoice.reprints[invoice.reprints.length - 1].reprintedAt)}
        </p>
      )}
      {invoice.customerName && <p>Khách: {invoice.customerName}</p>}
      <hr className="my-2 border-dashed border-black" />
      {lines.map((l) => (
        <div key={l.id} className="mb-1">
          <div className="flex justify-between gap-2">
            <span>
              {l.quantity}× {l.name}
            </span>
            <span>{formatMoney((l.unitPrice + l.toppingTotal) * l.quantity)}</span>
          </div>
          {opt(l) && <div className="pl-4 text-[11px]">{opt(l)}</div>}
          {l.discountPercent > 0 && (
            <div className="pl-4 text-[11px]">Giảm {l.discountPercent}%</div>
          )}
        </div>
      ))}
      <hr className="my-2 border-dashed border-black" />
      <div className="flex justify-between">
        <span>Tạm tính</span>
        <span>{formatMoney(invoice.subtotal + invoice.promotionDiscount)}</span>
      </div>
      {invoice.promotionDiscount > 0 && (
        <div className="flex justify-between">
          <span>Khuyến mãi</span>
          <span>-{formatMoney(invoice.promotionDiscount)}</span>
        </div>
      )}
      {invoice.pointsUsed > 0 && (
        <div className="flex justify-between">
          <span>Dùng {invoice.pointsUsed} điểm</span>
          <span>-{formatMoney(invoice.pointsUsed * 1000)}</span>
        </div>
      )}
      <div className="mt-1 flex justify-between text-sm font-bold">
        <span>THANH TOÁN</span>
        <span>{formatMoney(invoice.total)}</span>
      </div>
      <p>{invoice.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản / QR'}</p>
      {invoice.pointsEarned > 0 && <p>Điểm tích lũy mới: +{invoice.pointsEarned}</p>}
      <p className="mt-2 text-center text-[11px]">Giá đã bao gồm thuế. Cảm ơn quý khách!</p>
    </div>
  )
}
