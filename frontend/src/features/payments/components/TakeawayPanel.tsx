import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { NumberField } from '@/components/ui/Field'
import { MemberPicker } from '@/features/customers/components/MemberPicker'
import type { Customer } from '@/features/customers/api/customersApi'
import { cartTotal, toNewLines, type CartLine } from '@/features/orders/components/Cart'
import { CartPanel } from '@/features/orders/components/CartPanel'
import { MenuPicker } from '@/features/orders/components/MenuPicker'
import { ordersApi, type OrderDetail } from '@/features/orders/api/ordersApi'
import { useAction } from '@/hooks/useAction'
import { formatMoney } from '@/utils/format'
import { paymentsApi, type PayOrder } from '../api/paymentsApi'
import { PaidDialog, PayDialog } from './PayDialog'

const round500 = (n: number) => Math.floor(n / 500 + 0.5) * 500

/** UC-12: đơn mang đi (đồ uống lạnh và bánh). Tiền mặt thanh toán ngay; chuyển khoản/QR tạo đơn nháp chờ xác nhận (BR-014). */
export function TakeawayPanel() {
  const [cart, setCart] = useState<CartLine[]>([])
  const [method, setMethod] = useState<'CASH' | 'TRANSFER'>('CASH')
  const [member, setMember] = useState<Customer | null>(null)
  const [points, setPoints] = useState('0')
  const [received, setReceived] = useState('')
  const [done, setDone] = useState<OrderDetail | null>(null)
  const drafts = useQuery({ queryKey: ['ops', 'drafts'], queryFn: paymentsApi.drafts })
  const [confirming, setConfirming] = useState<PayOrder | null>(null)

  const lines = toNewLines(cart)
  const signature = JSON.stringify(lines)
  const quote = useQuery({
    queryKey: ['ops', 'quote', signature],
    queryFn: () => ordersApi.quote(lines),
    enabled: cart.length > 0,
    retry: false,
  })
  const total = quote.data?.total ?? cartTotal(cart)
  const afterPromo = quote.data?.afterPromo ?? total
  const maxPoints = member ? Math.min(quote.data?.maxPoints ?? 0, member.points) : 0
  const usedPoints = method === 'CASH' ? Math.min(Number(points || 0), maxPoints) : 0
  const payable = round500(afterPromo - usedPoints * 1000)
  const cashIn = received === '' ? payable : Number(received)

  const submit = useAction(
    () =>
      ordersApi.takeaway({
        lines,
        method,
        received: method === 'CASH' ? cashIn : undefined,
        customerId: method === 'CASH' ? member?.id : undefined,
        points: usedPoints,
      }),
    {
      invalidate: [['ops'], ['invoices'], ['customers']],
      onDone: (o) => {
        setCart([])
        setMember(null)
        setPoints('0')
        setReceived('')
        if (o.status === 'PAID') setDone(o)
      },
      success: (o) =>
        o.status === 'DRAFT'
          ? 'Đã tạo đơn nháp chờ xác nhận chuyển khoản'
          : 'Đã tạo đơn và thanh toán',
    },
  )
  const cancelDraft = useAction((id: number) => paymentsApi.cancelDraft(id), {
    invalidate: [['ops']],
    success: 'Đã hủy đơn nháp',
  })

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="min-w-0">
        <h2 className="mb-2 text-lg font-bold">Chọn món mang đi</h2>
        <MenuPicker takeaway onAdd={(l) => setCart((cur) => [...cur, l])} />
      </Card>
      <div className="flex min-w-0 flex-col gap-4">
        <Card>
          <h2 className="mb-2 text-lg font-bold">Đơn mang đi</h2>
          <CartPanel lines={cart} onChange={setCart} />
          {cart.length > 0 && (
            <div className="mt-3 flex flex-col gap-3">
              {(quote.data?.discount ?? 0) > 0 && (
                <p className="flex justify-between text-success">
                  <span>Khuyến mãi đang áp dụng</span>
                  <span>-{formatMoney(quote.data!.discount)}</span>
                </p>
              )}
              {quote.error && (
                <p role="alert" className="text-sm text-danger">
                  Không tính thử được. Vui lòng kiểm tra món đã chọn.
                </p>
              )}
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
              {method === 'CASH' && (
                <>
                  <MemberPicker
                    member={member}
                    onChange={(m) => {
                      setMember(m)
                      setPoints('0')
                    }}
                  />
                  {member && (
                    <NumberField
                      label={`Số điểm dùng (tối đa ${maxPoints})`}
                      value={points}
                      onValueChange={(v) => setPoints(String(Math.min(Number(v || 0), maxPoints)))}
                    />
                  )}
                  <p className="flex justify-between text-lg font-bold">
                    <span>Khách phải trả</span>
                    <span>{formatMoney(payable)}</span>
                  </p>
                  <NumberField
                    label="Tiền khách đưa (đồng)"
                    value={received}
                    onValueChange={setReceived}
                    hint={
                      cashIn >= payable ? `Tiền thối: ${formatMoney(cashIn - payable)}` : undefined
                    }
                  />
                </>
              )}
              <Button
                disabled={method === 'CASH' && cashIn < payable}
                loading={submit.isPending}
                onClick={() => submit.mutate(undefined)}
              >
                {method === 'CASH' ? 'Thanh toán và gửi pha chế' : 'Tạo đơn nháp chờ chuyển khoản'}
              </Button>
            </div>
          )}
        </Card>
        <Card>
          <h2 className="mb-2 text-lg font-bold">Đơn nháp chờ chuyển khoản</h2>
          {(drafts.data ?? []).length === 0 && <p className="text-ink-soft">Không có đơn nháp.</p>}
          <ul className="divide-y divide-line">
            {(drafts.data ?? []).map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 py-2">
                <div>
                  <p className="font-semibold">Đơn nháp #{d.id}</p>
                  <p className="text-sm text-ink-soft">
                    {d.lines
                      .filter((l) => l.status !== 'CANCELLED')
                      .map((l) => `${l.qty}× ${l.name}`)
                      .join(', ')}{' '}
                    · {formatMoney(d.rounded)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setConfirming(d)}>Xác nhận</Button>
                  <Button
                    variant="secondary"
                    loading={cancelDraft.isPending}
                    onClick={() => cancelDraft.mutate(d.id)}
                  >
                    Hủy
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      {confirming && <PayDialog order={confirming} draft onClose={() => setConfirming(null)} />}
      {done && <PaidDialog order={done} onClose={() => setDone(null)} />}
    </div>
  )
}
