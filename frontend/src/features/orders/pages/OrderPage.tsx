import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { QueryState } from '@/components/feedback/QueryState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/features/auth'
import { ReasonDialog } from '@/features/invoices/components/ReasonDialog'
import { useAction } from '@/hooks/useAction'
import { tablesApi } from '@/features/tables/api/tablesApi'
import { formatMoney } from '@/utils/format'
import { ICE_LABEL, ordersApi, type OrderLineDetail } from '../api/ordersApi'
import { toNewLines, type CartLine } from '../components/Cart'
import { CartPanel } from '../components/CartPanel'
import { MenuPicker } from '../components/MenuPicker'

const LINE_LABEL = { NEW: 'Mới', MAKING: 'Đang pha', DONE: 'Xong', CANCELLED: 'Đã hủy' } as const
const LINE_TONE = {
  NEW: 'neutral',
  MAKING: 'warning',
  DONE: 'success',
  CANCELLED: 'danger',
} as const

function describe(l: OrderLineDetail): string {
  return [
    l.cake ? null : `Cỡ ${l.size}`,
    l.temp === 'HOT' ? 'Nóng' : l.temp === 'COLD' ? 'Lạnh' : null,
    l.sugar ? `Đường ${l.sugar}%` : null,
    l.ice && l.ice !== '-' ? ICE_LABEL[l.ice] : null,
    ...l.toppings,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** UC-08 tạo đơn, UC-09 gọi thêm món, UC-10 chuyển bàn, UC-11 xác nhận chờ thanh toán, UC-15 hủy món — màn một bàn. */
export default function OrderPage() {
  const { no } = useParams()
  const table = Number(no)
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const order = useQuery({
    queryKey: ['ops', 'order', table],
    queryFn: () => ordersApi.atTable(table),
  })
  const [cart, setCart] = useState<CartLine[]>([])
  const [cancelling, setCancelling] = useState<OrderLineDetail | null>(null)
  const [moving, setMoving] = useState(false)
  const owner = user?.role === 'OWNER'
  const refresh = () => void qc.invalidateQueries({ queryKey: ['ops'] })

  const send = useAction(() => ordersApi.send(table, toNewLines(cart)), {
    success: 'Đã gửi order xuống quầy pha chế',
    onDone: () => {
      setCart([])
      refresh()
    },
  })
  const cancel = useAction(
    (v: { line: OrderLineDetail; reason?: string }) =>
      ordersApi.cancelLine(order.data!.id, v.line.id, v.reason),
    {
      success: 'Đã hủy món',
      onDone: () => {
        setCancelling(null)
        refresh()
      },
    },
  )
  const finish = useAction(() => ordersApi.finish(order.data!.id), {
    success: 'Bàn đã chuyển sang Chờ thanh toán',
    onDone: () => {
      refresh()
      navigate('..', { relative: 'path' })
    },
  })

  const o = order.data
  const waitingPay = o?.waitingPay === true
  const busyLines = (o?.lines ?? []).filter(
    (l) => l.status === 'NEW' || l.status === 'MAKING',
  ).length

  return (
    <section aria-label={`Bàn ${table}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Bàn {table}</h1>
        <Link
          to=".."
          relative="path"
          className="rounded-2xl border border-line bg-white/70 px-4 py-2 font-semibold hover:bg-coffee-100"
        >
          ← Sơ đồ bàn
        </Link>
      </div>
      <QueryState
        isPending={order.isPending}
        error={order.error}
        onRetry={() => void order.refetch()}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="order-2 flex min-w-0 flex-col gap-4">
            <Card>
              <h2 className="mb-2 text-lg font-bold">Món đã chọn</h2>
              <CartPanel lines={cart} onChange={setCart} />
              <Button
                className="mt-3 w-full"
                disabled={cart.length === 0}
                loading={send.isPending}
                onClick={() => send.mutate(undefined)}
              >
                {o ? 'Gửi thêm món' : 'Gửi order'}
              </Button>
            </Card>
            {o && (
              <Card>
                <h2 className="mb-2 text-lg font-bold">Đơn đã gửi</h2>
                {
                  <>
                    <ul className="divide-y divide-line">
                      {o.lines.map((l) => (
                        <li key={l.id} className="flex items-start justify-between gap-2 py-2">
                          <div>
                            <p
                              className={
                                l.status === 'CANCELLED'
                                  ? 'font-semibold line-through opacity-60'
                                  : 'font-semibold'
                              }
                            >
                              {l.qty}× {l.name}
                            </p>
                            <p className="text-xs text-ink-soft">{describe(l)}</p>
                            {l.discountPercent > 0 && (
                              <p className="text-xs text-success">
                                Khuyến mãi -{l.discountPercent}%
                              </p>
                            )}
                            {l.cancelReason && (
                              <p className="text-xs text-danger">Lý do hủy: {l.cancelReason}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge tone={LINE_TONE[l.status]}>{LINE_LABEL[l.status]}</Badge>
                            {!waitingPay &&
                              (l.status === 'NEW' || (l.status === 'MAKING' && owner)) && (
                                <Button
                                  variant="ghost"
                                  onClick={() =>
                                    l.status === 'NEW'
                                      ? cancel.mutate({ line: l })
                                      : setCancelling(l)
                                  }
                                >
                                  Hủy món
                                </Button>
                              )}
                          </div>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 flex justify-between text-lg font-bold">
                      <span>Tạm tính</span>
                      <span>{formatMoney(o.total)}</span>
                    </p>
                    {o.discount > 0 && (
                      <p className="text-right text-sm text-success">
                        Đã trừ khuyến mãi {formatMoney(o.discount)}
                      </p>
                    )}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        variant="secondary"
                        disabled={waitingPay}
                        onClick={() => setMoving(true)}
                      >
                        Chuyển bàn
                      </Button>
                      <Button
                        disabled={waitingPay || busyLines > 0}
                        loading={finish.isPending}
                        onClick={() => finish.mutate(undefined)}
                      >
                        Khách đã dùng xong
                      </Button>
                    </div>
                    {busyLines > 0 && !waitingPay && (
                      <p className="mt-1 text-xs text-ink-soft">
                        Còn {busyLines} món chưa xong hoặc chưa hủy.
                      </p>
                    )}
                  </>
                }
              </Card>
            )}
          </div>
          <div className="order-1 flex min-w-0 flex-col gap-4">
            <Card>
              <h2 className="mb-2 text-lg font-bold">Chọn món</h2>
              <MenuPicker onAdd={(line) => setCart((cur) => [...cur, line])} />
            </Card>
          </div>
        </div>
      </QueryState>
      {cancelling && (
        <ReasonDialog
          title={`Hủy món đang pha: ${cancelling.name}`}
          confirmLabel="Hủy món"
          loading={cancel.isPending}
          onConfirm={(reason) => cancel.mutate({ line: cancelling, reason })}
          onClose={() => setCancelling(null)}
        />
      )}
      {moving && o && (
        <MoveDialog
          orderId={o.id}
          onClose={() => setMoving(false)}
          onMoved={(to) => {
            setMoving(false)
            refresh()
            navigate(`../${to}`, { relative: 'path', replace: true })
          }}
        />
      )}
    </section>
  )
}

function MoveDialog({
  orderId,
  onClose,
  onMoved,
}: {
  orderId: number
  onClose: () => void
  onMoved: (to: number) => void
}) {
  const tables = useQuery({ queryKey: ['ops', 'tables'], queryFn: tablesApi.list })
  const move = useAction((to: number) => ordersApi.move(orderId, to), {
    success: 'Đã chuyển bàn',
    onDone: (_, to) => onMoved(to),
  })
  const empty = (tables.data ?? []).filter((t) => t.status === 'EMPTY')
  return (
    <Modal title="Chuyển sang bàn trống" onClose={onClose}>
      <QueryState isPending={tables.isPending} error={tables.error}>
        {empty.length === 0 ? (
          <p className="text-ink-soft">Hiện không còn bàn trống.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {empty.map((t) => (
              <Button
                key={t.no}
                variant="secondary"
                loading={move.isPending && move.variables === t.no}
                onClick={() => move.mutate(t.no)}
              >
                Bàn {t.no}
              </Button>
            ))}
          </div>
        )}
      </QueryState>
    </Modal>
  )
}
