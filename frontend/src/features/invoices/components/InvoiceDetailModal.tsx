import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { QueryState } from '@/components/feedback/QueryState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { useAction } from '@/hooks/useAction'
import { formatDateTime, formatMoney, orderLabel } from '@/utils/format'
import { invoicesApi, type InvoiceDetail } from '../api/invoicesApi'
import { ReasonDialog } from './ReasonDialog'
import { Receipt } from './Receipt'

const LINE_LABEL = { NEW: 'Mới', MAKING: 'Đang pha', DONE: 'Xong', CANCELLED: 'Đã hủy' } as const

/**
 * UC-34 chi tiết hóa đơn, UC-23 in lại, UC-24 hủy hóa đơn, UC-13 hủy dòng món đã thanh toán, xác nhận hoàn tiền.
 * Cashier chỉ xem và in lại; thao tác hủy/hoàn tiền chỉ hiện cho Chủ quán/Quản lý (BR-026, BR-031).
 * Hóa đơn đã hủy chỉ Chủ quán/Quản lý được in lại (UC-23 E2).
 */
export function InvoiceDetailModal({
  invoiceId,
  owner,
  onClose,
}: {
  invoiceId: number
  owner: boolean
  onClose: () => void
}) {
  const qc = useQueryClient()
  const detail = useQuery({
    queryKey: ['invoices', 'detail', invoiceId],
    queryFn: () => invoicesApi.detail(invoiceId),
  })
  const [reprinting, setReprinting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelLineId, setCancelLineId] = useState<number | null>(null)
  const done = (d: InvoiceDetail) => {
    qc.setQueryData(['invoices', 'detail', invoiceId], d)
    void qc.invalidateQueries({ queryKey: ['invoices', 'list'] })
    void qc.invalidateQueries({ queryKey: ['ops'] })
  }
  const reprint = useAction(() => invoicesApi.reprint(invoiceId), {
    success: 'Đã ghi nhận lần in lại',
    onDone: (d) => {
      done(d)
      setReprinting(true)
      window.setTimeout(() => window.print(), 100)
    },
  })
  const cancel = useAction((reason: string) => invoicesApi.cancel(invoiceId, reason), {
    success: 'Đã hủy hóa đơn',
    onDone: (d) => {
      done(d)
      setCancelling(false)
    },
  })
  const cancelLine = useAction(
    (v: { lineId: number; reason: string }) =>
      invoicesApi.cancelLine(invoiceId, v.lineId, v.reason),
    {
      success: 'Đã hủy dòng món, đã ghi bản điều chỉnh hoàn tiền',
      onDone: (d) => {
        done(d)
        setCancelLineId(null)
      },
    },
  )
  const confirmRefund = useAction((id: number) => invoicesApi.confirmRefund(id), {
    success: 'Đã xác nhận hoàn tiền cho khách',
    onDone: done,
  })

  return (
    <Modal title="Chi tiết hóa đơn" onClose={onClose} wide>
      <QueryState
        isPending={detail.isPending}
        error={detail.error}
        onRetry={() => void detail.refetch()}
      >
        {detail.data && (
          <div className="flex flex-col gap-4">
            <Summary d={detail.data} />
            <DataTable
              rows={detail.data.lines}
              rowKey={(l) => l.id}
              columns={[
                {
                  header: 'Món',
                  cell: (l) => (
                    <div>
                      <span className="font-semibold">{l.name}</span> ({l.size})
                      {l.toppings.length > 0 && (
                        <div className="text-xs text-ink-soft">{l.toppings.join(', ')}</div>
                      )}
                      {l.cancelReason && (
                        <div className="text-xs text-danger">Lý do hủy: {l.cancelReason}</div>
                      )}
                    </div>
                  ),
                },
                {
                  header: 'SL',
                  className: 'whitespace-nowrap text-center',
                  cell: (l) => l.quantity,
                },
                {
                  header: 'Đơn giá',
                  className: 'whitespace-nowrap text-right',
                  cell: (l) => formatMoney(l.unitPrice + l.toppingTotal),
                },
                {
                  header: 'KM',
                  className: 'whitespace-nowrap text-center',
                  cell: (l) => (l.discountPercent ? `${l.discountPercent}%` : '—'),
                },
                {
                  header: 'Trạng thái',
                  className: 'whitespace-nowrap',
                  cell: (l) => LINE_LABEL[l.status],
                },
                {
                  header: '',
                  cell: (l) =>
                    owner && l.canCancel ? (
                      <Button variant="secondary" onClick={() => setCancelLineId(l.id)}>
                        Hủy dòng
                      </Button>
                    ) : null,
                },
              ]}
            />
            {detail.data.refunds.length > 0 && (
              <div>
                <h3 className="mb-2 font-bold">Hoàn tiền</h3>
                <DataTable
                  rows={detail.data.refunds}
                  rowKey={(r) => r.id}
                  columns={[
                    {
                      header: 'Loại',
                      cell: (r) =>
                        r.type === 'FULL' ? 'Toàn bộ (hủy hóa đơn)' : 'Một phần (hủy dòng món)',
                    },
                    { header: 'Tiền hoàn', cell: (r) => formatMoney(r.cashAmount) },
                    { header: 'Điểm hoàn', cell: (r) => r.pointsRefunded },
                    { header: 'Lý do', cell: (r) => r.reason },
                    {
                      header: 'Xác nhận đã trả',
                      cell: (r) =>
                        r.confirmedAt ? (
                          <span className="text-success">
                            {r.confirmedBy} · {formatDateTime(r.confirmedAt)}
                          </span>
                        ) : owner ? (
                          <Button
                            loading={confirmRefund.isPending}
                            onClick={() => confirmRefund.mutate(r.id)}
                          >
                            Đã hoàn tiền cho khách
                          </Button>
                        ) : (
                          <Badge tone="warning">Chờ Quản lý xác nhận</Badge>
                        ),
                    },
                  ]}
                />
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              {(owner || detail.data.status !== 'CANCELLED') && (
                <Button
                  variant="secondary"
                  loading={reprint.isPending}
                  onClick={() => reprint.mutate(undefined)}
                >
                  In lại hóa đơn
                </Button>
              )}
              {owner && detail.data.canCancel && (
                <Button variant="danger" onClick={() => setCancelling(true)}>
                  Hủy hóa đơn
                </Button>
              )}
            </div>
            {reprinting && <Receipt invoice={detail.data} reprint />}
            {!reprinting && (
              <div className="hidden print:block">
                <Receipt invoice={detail.data} />
              </div>
            )}
          </div>
        )}
      </QueryState>
      {cancelling && (
        <ReasonDialog
          title="Hủy hóa đơn"
          confirmLabel="Xác nhận hủy"
          loading={cancel.isPending}
          onConfirm={(reason) => cancel.mutate(reason)}
          onClose={() => setCancelling(false)}
        />
      )}
      {cancelLineId !== null && (
        <ReasonDialog
          title="Hủy dòng món đã thanh toán"
          confirmLabel="Hủy dòng món"
          loading={cancelLine.isPending}
          onConfirm={(reason) => cancelLine.mutate({ lineId: cancelLineId, reason })}
          onClose={() => setCancelLineId(null)}
        />
      )}
    </Modal>
  )
}

function Row({ label, children, tone }: { label: string; children: ReactNode; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 whitespace-nowrap">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={tone ?? 'font-semibold'}>{children}</dd>
    </div>
  )
}

function Summary({ d }: { d: InvoiceDetail }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 whitespace-nowrap">
        <p className="flex items-center gap-3 text-xl font-bold">
          {d.invoiceNo}
          <Badge tone={d.status === 'PAID' ? 'success' : 'danger'}>
            {d.status === 'PAID' ? 'Đã thanh toán' : 'Đã hủy'}
          </Badge>
        </p>
        <p className="font-semibold">
          {orderLabel(d)} · {d.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản / QR'}
        </p>
      </div>
      <dl className="grid gap-x-10 gap-y-1.5 rounded-2xl border border-line px-4 py-3 sm:grid-cols-2">
        <Row label="Phát hành">{formatDateTime(d.issuedAt)}</Row>
        <Row label="Khuyến mãi">-{formatMoney(d.promotionDiscount)}</Row>
        <Row label="Nhân viên">{d.issuedBy}</Row>
        <Row label="Điểm đã dùng">
          {d.pointsUsed} (-{formatMoney(d.pointsUsed * 1000)})
        </Row>
        <Row label="In lại">{d.reprintCount} lần</Row>
        <Row label="Điểm tích mới">+{d.pointsEarned}</Row>
        {d.customerName && (
          <div className="sm:col-span-2">
            <Row label="Thành viên">
              {d.customerName} · {d.customerPhone}
            </Row>
          </div>
        )}
      </dl>
      <p className="flex items-baseline justify-between gap-4 whitespace-nowrap text-xl font-bold">
        <span>Thực trả</span>
        <span>{formatMoney(d.total)}</span>
      </p>
      {d.status === 'CANCELLED' && (
        <p className="text-danger">
          Đã hủy: {d.cancelReason} — {d.cancelledBy}, {formatDateTime(d.cancelledAt)}
        </p>
      )}
    </div>
  )
}
