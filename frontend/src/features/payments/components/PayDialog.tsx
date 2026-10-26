import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { NumberField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { MemberPicker } from '@/features/customers/components/MemberPicker'
import type { Customer } from '@/features/customers/api/customersApi'
import { invoicesApi } from '@/features/invoices/api/invoicesApi'
import { Receipt } from '@/features/invoices/components/Receipt'
import type { OrderDetail } from '@/features/orders/api/ordersApi'
import { useAction } from '@/hooks/useAction'
import { formatMoney } from '@/utils/format'
import { paymentsApi, type PayMethod, type PayOrder } from '../api/paymentsApi'

const round500 = (n: number) => Math.floor(n / 500 + 0.5) * 500

/**
 * UC-22: thanh toán đơn tại quán (hoặc xác nhận đơn nháp chuyển khoản). Thứ tự tính tiền (BR-021): giá món → khuyến mãi →
 * điểm → làm tròn 500đ → tích điểm trên số tiền thực trả. Số liệu cuối cùng do backend tính; ở đây chỉ hiển thị xem trước.
 */
export function PayDialog({
  order,
  draft,
  onClose,
}: {
  order: PayOrder
  draft?: boolean
  onClose: () => void
}) {
  const [member, setMember] = useState<Customer | null>(null)
  const [points, setPoints] = useState('0')
  const [method, setMethod] = useState<PayMethod>(draft ? 'TRANSFER' : 'CASH')
  const [received, setReceived] = useState('')
  const [paid, setPaid] = useState<PayOrder | null>(null)

  const maxPoints = member ? Math.min(order.maxPoints, member.points) : 0
  const usedPoints = Math.min(Number(points || 0), maxPoints)
  const payable = round500(order.afterPromo - usedPoints * 1000)
  const earn = member ? Math.floor(payable / 10_000) : 0
  const cashIn = received === '' ? payable : Number(received)
  const payer = { customerId: member?.id, points: usedPoints }

  const submit = useAction(
    () =>
      draft
        ? paymentsApi.confirmDraft(order.id, payer)
        : paymentsApi.pay(order.id, method, method === 'CASH' ? cashIn : undefined, payer),
    {
      invalidate: [['ops'], ['invoices'], ['customers']],
      success: 'Thanh toán thành công',
      onDone: setPaid,
    },
  )

  if (paid) return <PaidDialog order={paid} onClose={onClose} />

  return (
    <Modal
      title={
        draft
          ? `Xác nhận đơn mang đi #${String(order.seq ?? 0).padStart(3, '0')}`
          : `Thanh toán bàn ${order.tableNo}`
      }
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        <ul className="text-sm">
          {order.lines
            .filter((l) => l.status !== 'CANCELLED')
            .map((l) => (
              <li key={l.id} className="flex justify-between py-0.5">
                <span>
                  {l.qty}× {l.name}
                </span>
                <span>{formatMoney(l.unitPrice * l.qty)}</span>
              </li>
            ))}
        </ul>
        <dl className="grid grid-cols-[1fr_auto] gap-y-1 border-t border-line pt-2">
          <dt>Tạm tính</dt>
          <dd>{formatMoney(order.total)}</dd>
          <dt>Khuyến mãi</dt>
          <dd>-{formatMoney(order.discount)}</dd>
          {usedPoints > 0 && (
            <>
              <dt>Dùng {usedPoints} điểm</dt>
              <dd>-{formatMoney(usedPoints * 1000)}</dd>
            </>
          )}
          <dt className="text-lg font-bold">Khách phải trả</dt>
          <dd className="text-lg font-bold">{formatMoney(payable)}</dd>
        </dl>

        <MemberPicker
          member={member}
          onChange={(m) => {
            setMember(m)
            setPoints('0')
          }}
        />
        {member && (
          <NumberField
            label={`Số điểm dùng (tối đa ${maxPoints}; 1 điểm = 1.000đ)`}
            value={points}
            onValueChange={(v) => setPoints(String(Math.min(Number(v || 0), maxPoints)))}
            hint={earn > 0 ? `Sẽ tích thêm ${earn} điểm` : undefined}
          />
        )}

        {!draft && (
          <div
            role="radiogroup"
            aria-label="Phương thức thanh toán"
            className="grid grid-cols-2 gap-2"
          >
            {(['CASH', 'TRANSFER'] as const).map((m) => (
              <Button
                key={m}
                role="radio"
                aria-checked={method === m}
                variant={method === m ? 'primary' : 'secondary'}
                onClick={() => setMethod(m)}
              >
                {m === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản / QR'}
              </Button>
            ))}
          </div>
        )}
        {!draft && method === 'CASH' && (
          <NumberField
            label="Tiền khách đưa (đồng)"
            value={received}
            onValueChange={setReceived}
            hint={cashIn >= payable ? `Tiền thối: ${formatMoney(cashIn - payable)}` : undefined}
          />
        )}
        <Button
          disabled={!draft && method === 'CASH' && cashIn < payable}
          loading={submit.isPending}
          onClick={() => submit.mutate(undefined)}
        >
          {draft ? 'Đã nhận đủ tiền, xác nhận đơn' : 'Xác nhận thanh toán'}
        </Button>
      </div>
    </Modal>
  )
}

/** Kết quả thanh toán: tiền thối, số thứ tự (đơn mang đi) và in hóa đơn 80 mm. */
export type PaidInfo = Pick<
  OrderDetail,
  'invoiceNo' | 'rounded' | 'type' | 'seq' | 'payMethod' | 'pointsEarned' | 'customerName'
> & {
  change?: number
}

export function PaidDialog({ order, onClose }: { order: PaidInfo; onClose: () => void }) {
  const invoiceId = Number(order.invoiceNo?.replace(/\D/g, ''))
  const invoice = useQuery({
    queryKey: ['invoices', 'detail', invoiceId],
    queryFn: () => invoicesApi.detail(invoiceId),
    enabled: invoiceId > 0,
  })
  return (
    <Modal title="Đã thanh toán" onClose={onClose}>
      <div className="flex flex-col gap-3 text-center">
        <p className="text-lg">
          Hóa đơn <b>{order.invoiceNo}</b> · {formatMoney(order.rounded)}
        </p>
        {order.type === 'TAKEAWAY' && order.seq !== null && (
          <p className="text-4xl font-bold">#{String(order.seq).padStart(3, '0')}</p>
        )}
        {order.payMethod === 'CASH' && order.change !== undefined && (
          <p>
            Tiền thối: <b>{formatMoney(order.change)}</b>
          </p>
        )}
        {order.pointsEarned > 0 && (
          <p className="text-success">
            Tích thêm {order.pointsEarned} điểm cho {order.customerName}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" disabled={!invoice.data} onClick={() => window.print()}>
            In hóa đơn
          </Button>
          <Button onClick={onClose}>Xong</Button>
        </div>
        {invoice.data && (
          <div className="hidden print:block">
            <Receipt invoice={invoice.data} />
          </div>
        )}
      </div>
    </Modal>
  )
}
