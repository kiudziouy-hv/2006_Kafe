import { useQuery } from '@tanstack/react-query'
import { Banknote, Clock, Receipt, ShoppingBag, Wallet } from 'lucide-react'
import { useState } from 'react'
import { QueryState } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Tabs } from '@/components/ui/Tabs'
import InvoicesPage from '@/features/invoices/pages/InvoicesPage'
import { formatMoney } from '@/utils/format'
import { paymentsApi, type PayOrder } from '../api/paymentsApi'
import { PayDialog } from '../components/PayDialog'
import { ShiftPanel } from '../components/ShiftPanel'
import { TakeawayPanel } from '../components/TakeawayPanel'

type Tab = 'pay' | 'takeaway' | 'invoices' | 'shift'

/** Màn Thu ngân: UC-22 thanh toán, UC-12 đơn mang đi, UC-23 in lại hóa đơn, UC-30/31 ca. Mọi kiểm tra tiền/ca do backend thực hiện. */
export default function PaymentsPage() {
  const shift = useQuery({ queryKey: ['ops', 'shift'], queryFn: paymentsApi.shift })
  const [tab, setTab] = useState<Tab>('pay')
  const open = shift.data?.open === true
  const effective: Tab = !open && (tab === 'pay' || tab === 'takeaway') ? 'shift' : tab

  return (
    <QueryState
      isPending={shift.isPending}
      error={shift.error}
      onRetry={() => void shift.refetch()}
    >
      <Tabs
        value={effective}
        onChange={setTab}
        tabs={[
          { id: 'pay', label: 'Chờ thanh toán', icon: Wallet },
          { id: 'takeaway', label: 'Đơn mang đi', icon: ShoppingBag },
          { id: 'invoices', label: 'Hóa đơn', icon: Receipt },
          { id: 'shift', label: 'Ca thu ngân', icon: Clock },
        ]}
      />
      {effective === 'pay' && <PendingList />}
      {effective === 'takeaway' && <TakeawayPanel />}
      {effective === 'invoices' && <InvoicesPage />}
      {effective === 'shift' && <ShiftPanel />}
    </QueryState>
  )
}

function PendingList() {
  const pending = useQuery({ queryKey: ['ops', 'pending'], queryFn: paymentsApi.pending })
  const [paying, setPaying] = useState<PayOrder | null>(null)
  return (
    <section aria-label="Đơn chờ thanh toán">
      <h2 className="mb-2 text-lg font-bold">Đơn chờ thanh toán</h2>
      <QueryState
        isPending={pending.isPending}
        error={pending.error}
        onRetry={() => void pending.refetch()}
      >
        {pending.data?.length === 0 && (
          <EmptyState icon={Banknote}>Chưa có đơn nào chờ thanh toán.</EmptyState>
        )}
        <div className="grid gap-3 md:grid-cols-3">
          {pending.data?.map((o) => (
            <Card key={o.id}>
              <h3 className="text-lg font-bold">Bàn {o.tableNo}</h3>
              <p className="text-sm text-ink-soft">
                {o.waitingPay ? 'Khách đã dùng xong' : 'Bàn đang phục vụ, chưa thể thanh toán'}
              </p>
              <p className="text-2xl font-bold">{formatMoney(o.rounded)}</p>
              {o.discount > 0 && (
                <p className="text-sm text-success">Đã trừ khuyến mãi {formatMoney(o.discount)}</p>
              )}
              <Button className="mt-3 w-full" disabled={!o.waitingPay} onClick={() => setPaying(o)}>
                Thanh toán
              </Button>
            </Card>
          ))}
        </div>
      </QueryState>
      {paying && <PayDialog order={paying} onClose={() => setPaying(null)} />}
    </section>
  )
}
