import { useEffect, useState } from 'react'
import { Button, DialogOverlay } from '../../components/ui'
import { money, nowHM, useStore, type Draft } from '../../store'
import CashierLayout, { DataTable } from './CashierLayout'

// S26 — Đơn nháp chuyển khoản/QR; S26b — lệch số tiền khi xác nhận (BR-014/ASM-03)
export default function Drafts() {
  const { drafts, removeDraft, addInvoice, invoices, toast } = useStore()
  const [mismatch, setMismatch] = useState<Draft | null>(null)

  useEffect(() => {
    if (drafts.length) toast({ type: 'warning', title: `Còn ${drafts.length} đơn nháp`, message: 'Hãy xác nhận hoặc hủy trước khi chốt ca.' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const confirm = (d: Draft) => {
    if (d.changedAmount) return setMismatch(d)
    addInvoice({
      id: `HĐ mẫu ${invoices.length + 1}`, time: nowHM(), kind: 'Mang đi', method: 'transfer', total: d.amount, discount: 0,
      pointsUsed: d.points ?? 0, pointsEarned: Math.floor(d.amount / 10000), lines: [{ qty: 1, name: d.items, amount: d.amount }],
    })
    removeDraft(d.id)
    toast({ type: 'success', title: 'Đã xác nhận đơn nháp', message: `${money(d.amount)} · đã phát sinh hóa đơn.` })
  }

  const cancel = (d: Draft) => {
    removeDraft(d.id)
    setMismatch(null)
    toast({ type: 'success', title: 'Đã hủy đơn nháp', message: `Đơn nháp ${d.id} đã hủy.` })
  }

  return (
    <CashierLayout title="Đơn nháp chờ xác nhận">
      <DataTable head={['Tạo lúc', 'Món', 'Cần nhận (sau KM, điểm)', 'Thao tác']}>
        {drafts.map((d) => (
          <tr key={d.id} className="bg-white/40">
            <td className="px-4 py-3">{d.createdAt}</td>
            <td className="px-4 py-3">{d.items}</td>
            <td className="px-4 py-3 text-right">
              {money(d.changedAmount ?? d.amount)}
              {d.points ? ` (dùng ${d.points} điểm)` : ''}
            </td>
            <td className="px-4 py-2">
              <div className="flex gap-1">
                <Button onClick={() => confirm(d)}>Đã nhận đủ tiền</Button>
                <Button variant="destructive-text" onClick={() => cancel(d)}>
                  Hủy đơn nháp
                </Button>
              </div>
            </td>
          </tr>
        ))}
        {drafts.length === 0 && (
          <tr>
            <td colSpan={4} className="px-4 py-6 text-center text-text-secondary">
              Không còn đơn nháp nào.
            </td>
          </tr>
        )}
      </DataTable>

      {mismatch && (
        <DialogOverlay onClose={() => setMismatch(null)}>
          <div className="flex flex-col gap-3 rounded-[28px] border border-glass-stroke bg-[#f5eee2] p-6 shadow-[0_20px_48px_-8px_rgba(47,24,5,0.28)]">
            <h2 className="text-xl font-semibold">Số tiền cần nhận đã thay đổi</h2>
            <p className="text-xs text-text-secondary">
              Đơn nháp {mismatch.id} nay cần nhận {money(mismatch.amount)} thay vì {money(mismatch.changedAmount!)}, hoặc số điểm dự kiến không còn hợp lệ. Đơn chưa được xác nhận, không trừ điểm, không phát
              sinh hóa đơn. Hãy hủy đơn nháp và tạo lại, hoặc kiểm tra lại với khách.
            </p>
            <div className="flex gap-2 [&>*]:flex-1">
              <Button variant="destructive-text" onClick={() => cancel(mismatch)}>
                Hủy đơn nháp
              </Button>
              <Button onClick={() => setMismatch(null)}>Kiểm tra lại</Button>
            </div>
          </div>
        </DialogOverlay>
      )}
    </CashierLayout>
  )
}
