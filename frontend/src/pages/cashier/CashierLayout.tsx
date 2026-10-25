import { useState, type ReactNode } from 'react'
import TopNav, { TabChips } from '../../components/TopNav'
import { Button, DialogOverlay, TextField } from '../../components/ui'
import { useStore } from '../../store'

const TABS = [
  { to: '/thu-ngan', label: 'Sơ đồ bàn', end: true },
  { to: '/thu-ngan/mang-di', label: 'Đơn mang đi' },
  { to: '/thu-ngan/don-nhap', label: 'Đơn nháp' },
  { to: '/thu-ngan/chot-ca', label: 'Chốt ca' },
  { to: '/thu-ngan/hoa-don', label: 'Hóa đơn' },
]

type Props = { title: string; children: ReactNode; tabs?: boolean; right?: ReactNode }

// Khung màn Thu ngân (POS 1280×800): Top Navigation + tab chip; S20 mở ca khi chưa có ca.
export default function CashierLayout({ title, children, tabs = true, right }: Props) {
  const { shift, setShift, toast } = useStore()
  const [opening, setOpening] = useState('500.000')
  const [error, setError] = useState('')

  const openShift = () => {
    const n = Number(opening.replace(/\D/g, ''))
    if (!n) {
      setError('Nhập số tiền mặt đầu ca.')
      toast({ type: 'error', title: 'Chưa thể mở ca', message: 'Số tiền mặt đầu ca không hợp lệ.' })
      return
    }
    setShift({ ...shift, open: true, opening: n })
    toast({ type: 'success', title: 'Đã mở ca thu ngân', message: `${shift.name} · tiền đầu ca ${n.toLocaleString('vi-VN')}đ` })
  }

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-bg-canvas p-4">
      <TopNav title={title} user="Thu ngân mẫu B" role="Thu ngân" right={right} />
      <div className="flex flex-1 animate-page-in flex-col gap-4 px-2 pt-1 lg:px-2">
        {tabs && <TabChips tabs={TABS} />}
        {children}
      </div>

      {!shift.open && (
        <DialogOverlay>
          <div className="flex flex-col gap-3 rounded-[24px] border border-glass-stroke bg-[#f5eee2] p-6 shadow-[0_20px_48px_-8px_rgba(47,24,5,0.28)]">
            <h2 className="text-xl leading-7 font-semibold">Mở phiên ca thu ngân</h2>
            <TextField
              label="Tiền mặt đầu ca (đ)"
              inputMode="numeric"
              value={opening}
              error={error}
              hint="Kiểm đếm và nhập số tiền mặt đầu ca."
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, '')
                setOpening(d ? Number(d).toLocaleString('vi-VN') : '')
              }}
            />
            <div className="flex gap-2 [&>*]:flex-1">
              <Button variant="destructive-text" onClick={() => history.back()}>
                Hủy
              </Button>
              <Button onClick={openShift}>Mở ca</Button>
            </div>
          </div>
        </DialogOverlay>
      )}
    </div>
  )
}

export function Panel({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col rounded-[18px] border border-border-default bg-bg-surface px-5 py-4 ${className}`}>
      {title && <h2 className="mb-2 text-base font-semibold">{title}</h2>}
      {children}
    </section>
  )
}

export function DataTable({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border-default bg-bg-surface">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-[#efe3c8] text-[11px] font-semibold text-text-secondary">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-default">{children}</tbody>
      </table>
    </div>
  )
}
