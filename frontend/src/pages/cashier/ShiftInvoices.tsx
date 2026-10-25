import { useState } from 'react'
import ReceiptDialog from '../../components/Receipt'
import { Button } from '../../components/ui'
import { money, useStore, type Invoice } from '../../store'
import CashierLayout, { DataTable } from './CashierLayout'

// S29 — Hóa đơn trong ca (Thu ngân) · UC-23; S29b — xem trước bản in lại
export default function ShiftInvoices() {
  const { invoices, toast } = useStore()
  const [preview, setPreview] = useState<Invoice | null>(null)

  return (
    <CashierLayout title="Hóa đơn trong ca">
      <DataTable head={['Mã hóa đơn', 'Thời gian · Loại · Phương thức', 'Số tiền', 'Thao tác']}>
        {invoices.map((i) => (
          <tr key={i.id} className="bg-white/40">
            <td className="px-4 py-3">{i.id}</td>
            <td className="px-4 py-3">
              {i.time} · {i.kind} · {i.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản/QR'}
            </td>
            <td className="px-4 py-3 text-right">{money(i.total)}</td>
            <td className="px-4 py-2">
              {i.cancelled ? (
                <span className="block text-right text-sm">Đã hủy · chỉ Chủ quán/Quản lý in lại</span>
              ) : (
                <Button onClick={() => setPreview(i)}>In lại</Button>
              )}
            </td>
          </tr>
        ))}
      </DataTable>
      {preview && (
        <ReceiptDialog
          invoice={preview}
          reprint
          title="Bản in lại hóa đơn"
          onClose={() => setPreview(null)}
          onPrint={() => {
            toast({ type: 'success', title: 'Đã in lại hóa đơn', message: preview.id })
            setPreview(null)
          }}
        />
      )}
    </CashierLayout>
  )
}
