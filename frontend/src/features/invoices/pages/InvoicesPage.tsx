import { Receipt } from 'lucide-react'
import { PageTitle } from '@/components/ui/PageTitle'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { QueryState } from '@/components/feedback/QueryState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { SelectField, TextField } from '@/components/ui/Field'
import { useAuth } from '@/features/auth'
import { formatDateTime, formatMoney, orderLabel, todayIso } from '@/utils/format'
import { invoicesApi, type InvoiceFilter } from '../api/invoicesApi'
import { InvoiceDetailModal } from '../components/InvoiceDetailModal'

/**
 * UC-34 danh sách hóa đơn theo thời gian (kể cả đã hủy), lọc theo ngày/trạng thái/khách; UC-23 in lại.
 * Dùng chung cho Chủ quán/Quản lý (đủ quyền) và Thu ngân (xem và in lại).
 */
export default function InvoicesPage() {
  const { user } = useAuth()
  const owner = user?.role === 'OWNER'
  const [filter, setFilter] = useState<InvoiceFilter>({
    from: todayIso(),
    to: todayIso(),
    status: '',
    q: '',
  })
  const [applied, setApplied] = useState(filter)
  const [openId, setOpenId] = useState<number | null>(null)
  const list = useQuery({
    queryKey: ['invoices', 'list', applied],
    queryFn: () => invoicesApi.list(applied),
  })

  return (
    <section aria-label="Hóa đơn">
      <PageTitle icon={Receipt}>Hóa đơn</PageTitle>
      <form
        className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault()
          setApplied(filter)
        }}
      >
        <TextField
          label="Từ ngày"
          type="date"
          value={filter.from}
          max={filter.to || todayIso()}
          onChange={(e) => setFilter({ ...filter, from: e.target.value })}
        />
        <TextField
          label="Đến ngày"
          type="date"
          value={filter.to}
          min={filter.from}
          max={todayIso()}
          onChange={(e) => setFilter({ ...filter, to: e.target.value })}
        />
        <SelectField
          label="Trạng thái"
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
        >
          <option value="">Tất cả</option>
          <option value="PAID">Đã thanh toán</option>
          <option value="CANCELLED">Đã hủy</option>
        </SelectField>
        <TextField
          label="Mã HĐ / SĐT / tên khách"
          value={filter.q}
          onChange={(e) => setFilter({ ...filter, q: e.target.value })}
        />
        <Button
          type="submit"
          className="self-end"
          disabled={filter.from !== '' && filter.to !== '' && filter.from > filter.to}
        >
          Lọc
        </Button>
      </form>
      <QueryState isPending={list.isPending} error={list.error} onRetry={() => void list.refetch()}>
        <DataTable
          rows={list.data ?? []}
          rowKey={(i) => i.id}
          empty="Không có hóa đơn phù hợp."
          columns={[
            {
              header: 'Hóa đơn',
              cell: (i) => <span className="font-semibold">{i.invoiceNo}</span>,
            },
            { header: 'Thời điểm', cell: (i) => formatDateTime(i.issuedAt) },
            { header: 'Đơn', cell: (i) => orderLabel(i) },
            {
              header: 'Thanh toán',
              cell: (i) => (i.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'),
            },
            { header: 'Khách', cell: (i) => i.customerName ?? '—' },
            { header: 'Số tiền', cell: (i) => formatMoney(i.total), className: 'text-right' },
            {
              header: 'Trạng thái',
              cell: (i) => (
                <div className="flex flex-col gap-1">
                  <Badge tone={i.status === 'PAID' ? 'success' : 'danger'}>
                    {i.status === 'PAID' ? 'Đã thanh toán' : 'Đã hủy'}
                  </Badge>
                  {i.refundsPending > 0 && <Badge tone="warning">Chờ xác nhận hoàn tiền</Badge>}
                </div>
              ),
            },
            {
              header: '',
              cell: (i) => (
                <Button variant="secondary" onClick={() => setOpenId(i.id)}>
                  Chi tiết
                </Button>
              ),
            },
          ]}
        />
      </QueryState>
      {openId !== null && (
        <InvoiceDetailModal invoiceId={openId} owner={owner} onClose={() => setOpenId(null)} />
      )}
    </section>
  )
}
