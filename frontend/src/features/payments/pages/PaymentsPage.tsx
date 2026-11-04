import { useQuery } from '@tanstack/react-query'
import { Clock, LayoutGrid, Receipt, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { QueryState } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Tabs } from '@/components/ui/Tabs'
import InvoicesPage from '@/features/invoices/pages/InvoicesPage'
import { paymentsApi } from '../api/paymentsApi'
import { CashierTableMap } from '../components/CashierTableMap'
import { OpenShiftDialog, ShiftPanel } from '../components/ShiftPanel'
import { TakeawayPanel } from '../components/TakeawayPanel'

type Tab = 'tables' | 'takeaway' | 'invoices' | 'shift'

/** Màn Thu ngân: UC-22 thanh toán ngay trên sơ đồ bàn (bàn Chờ thanh toán), UC-07 sơ đồ bàn, UC-12 đơn mang đi, UC-23 in lại hóa đơn, UC-30/31 ca. Mọi kiểm tra tiền/ca do backend thực hiện. */
export default function PaymentsPage() {
  const shift = useQuery({ queryKey: ['ops', 'shift'], queryFn: paymentsApi.shift })
  const [tab, setTab] = useState<Tab>('tables')
  const [opening, setOpening] = useState(false)
  const open = shift.data?.open === true
  const needsShift = !open && tab === 'takeaway'

  return (
    <QueryState
      isPending={shift.isPending}
      error={shift.error}
      onRetry={() => void shift.refetch()}
    >
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'tables', label: 'Sơ đồ bàn', icon: LayoutGrid },
          { id: 'takeaway', label: 'Đơn mang đi', icon: ShoppingBag },
          { id: 'invoices', label: 'Hóa đơn', icon: Receipt },
          { id: 'shift', label: 'Ca thu ngân', icon: Clock },
        ]}
      />
      {needsShift && (
        <div className="flex flex-col items-center gap-3">
          <EmptyState icon={Clock}>Cần mở ca thu ngân mới tạo được đơn mang đi.</EmptyState>
          <Button onClick={() => setOpening(true)}>Mở ca thu ngân</Button>
        </div>
      )}
      {opening && <OpenShiftDialog onClose={() => setOpening(false)} />}
      {tab === 'tables' && <CashierTableMap />}
      {!needsShift && tab === 'takeaway' && <TakeawayPanel />}
      {tab === 'invoices' && <InvoicesPage />}
      {tab === 'shift' && <ShiftPanel />}
    </QueryState>
  )
}
