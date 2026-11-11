import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/components/feedback/Toaster'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TableGrid } from '@/features/tables/components/TableGrid'
import type { DiningTable } from '@/types/api'
import { formatMoney } from '@/utils/format'
import { paymentsApi, type PayOrder } from '../api/paymentsApi'
import { PayDialog } from './PayDialog'
import { OpenShiftDialog } from './ShiftPanel'

/**
 * S22: Thu ngân xem sơ đồ bàn (UC-07, ASM-02). Xem được cả khi chưa mở ca; chỉ bàn Chờ thanh toán bấm được
 * để mở thanh toán (UC-22), lúc đó mới cần ca đang mở.
 */
export function CashierTableMap() {
  const qc = useQueryClient()
  const { notify } = useToast()
  const shift = useQuery({ queryKey: ['ops', 'shift'], queryFn: paymentsApi.shift })
  const pending = useQuery({ queryKey: ['ops', 'pending'], queryFn: paymentsApi.pending })
  const [paying, setPaying] = useState<PayOrder | null>(null)
  const [askShift, setAskShift] = useState(false)
  const [opening, setOpening] = useState(false)
  const open = shift.data?.open === true

  const orderOf = (list: PayOrder[] | undefined, no: number) =>
    list?.find((o) => o.tableNo === no && o.waitingPay)

  const select = async (t: DiningTable) => {
    if (!open) {
      setAskShift(true)
      return
    }
    // Danh sách có thể cũ (vừa thanh toán ở máy khác): tải lại trước khi báo bàn không còn chờ
    const order = orderOf(pending.data, t.no) ?? orderOf((await pending.refetch()).data, t.no)
    if (order) {
      setPaying(order)
      return
    }
    notify({ tone: 'warning', title: 'Bàn này không còn chờ thanh toán' })
    void qc.invalidateQueries({ queryKey: ['ops', 'tables'] })
  }

  return (
    <section aria-label="Sơ đồ bàn">
      {askShift && !open && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm">
            <Clock size={18} aria-hidden />
            Chưa mở ca thu ngân, cần mở ca trước khi thu tiền.
          </p>
          <Button onClick={() => setOpening(true)}>Mở ca thu ngân</Button>
        </Card>
      )}
      <TableGrid
        mode="readonly"
        onSelect={(t) => void select(t)}
        note={(t) => {
          if (t.status === 'SERVING')
            return <span className="text-ink-soft">Chưa thể thanh toán</span>
          const o = t.status === 'WAITING_PAY' ? orderOf(pending.data, t.no) : undefined
          return o ? <span className="font-bold">{formatMoney(o.rounded)}</span> : null
        }}
      />
      {opening && <OpenShiftDialog onClose={() => setOpening(false)} />}
      {paying && <PayDialog order={paying} onClose={() => setPaying(null)} />}
    </section>
  )
}
