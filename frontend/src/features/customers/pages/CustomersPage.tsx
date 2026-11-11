import { Crown, Search } from 'lucide-react'
import { PageTitle } from '@/components/ui/PageTitle'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { QueryState } from '@/components/feedback/QueryState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { formatDateTime, formatMoney } from '@/utils/format'
import { customersApi, POINT_LABEL } from '../api/customersApi'

/** UC-26: tra cứu thành viên, điểm hiện tại, lịch sử điểm và lịch sử giao dịch. */
export default function CustomersPage() {
  const [q, setQ] = useState('')
  const [applied, setApplied] = useState('')
  const [phone, setPhone] = useState<string | null>(null)
  const list = useQuery({
    queryKey: ['customers', applied],
    queryFn: () => customersApi.list(applied),
  })
  return (
    <section aria-label="Thành viên">
      <PageTitle icon={Crown}>Thành viên</PageTitle>
      <form
        className="mb-4 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setApplied(q)
        }}
      >
        <label className="vt-field flex min-h-11 max-w-md flex-1 items-center gap-2 rounded-full border border-line bg-white px-4">
          <Search size={17} aria-hidden className="shrink-0 text-ink-soft" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên hoặc số điện thoại..."
            aria-label="Tìm theo tên hoặc số điện thoại"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-soft"
          />
        </label>
        <Button type="submit">Tìm</Button>
      </form>
      <QueryState isPending={list.isPending} error={list.error} onRetry={() => void list.refetch()}>
        <DataTable
          rows={list.data ?? []}
          rowKey={(c) => c.id}
          empty="Không có thành viên phù hợp."
          columns={[
            { header: 'Họ tên', cell: (c) => <span className="font-semibold">{c.fullName}</span> },
            { header: 'Số điện thoại', cell: (c) => c.phone },
            { header: 'Điểm', cell: (c) => c.points },
            {
              header: '',
              cell: (c) => (
                <Button variant="secondary" onClick={() => setPhone(c.phone)}>
                  Lịch sử
                </Button>
              ),
            },
          ]}
        />
      </QueryState>
      {phone && <Detail phone={phone} onClose={() => setPhone(null)} />}
    </section>
  )
}

function Detail({ phone, onClose }: { phone: string; onClose: () => void }) {
  const detail = useQuery({
    queryKey: ['customers', 'detail', phone],
    queryFn: () => customersApi.lookup(phone),
  })
  return (
    <Modal title="Thông tin thành viên" onClose={onClose} wide>
      <QueryState isPending={detail.isPending} error={detail.error}>
        {detail.data && (
          <div className="flex flex-col gap-4">
            <p className="text-lg">
              <b>{detail.data.fullName}</b> · {detail.data.phone} · <b>{detail.data.points}</b> điểm
            </p>
            <div>
              <h3 className="mb-2 font-bold">Lịch sử điểm</h3>
              <DataTable
                rows={detail.data.pointHistory}
                rowKey={(t) => t.id}
                empty="Chưa có biến động điểm."
                columns={[
                  { header: 'Thời điểm', cell: (t) => formatDateTime(t.createdAt) },
                  { header: 'Loại', cell: (t) => POINT_LABEL[t.type] },
                  { header: 'Điểm', cell: (t) => t.points },
                  {
                    header: 'Phần thiếu khi thu hồi',
                    cell: (t) => (t.shortfall ? t.shortfall : '—'),
                  },
                  { header: 'Hóa đơn', cell: (t) => t.invoiceNo ?? '—' },
                ]}
              />
            </div>
            <div>
              <h3 className="mb-2 font-bold">Lịch sử giao dịch</h3>
              <DataTable
                rows={detail.data.invoices}
                rowKey={(i) => i.id}
                empty="Chưa có giao dịch."
                columns={[
                  { header: 'Hóa đơn', cell: (i) => i.invoiceNo },
                  { header: 'Thời điểm', cell: (i) => formatDateTime(i.issuedAt) },
                  { header: 'Số tiền', cell: (i) => formatMoney(i.total) },
                  {
                    header: 'Điểm dùng / tích',
                    cell: (i) => `-${i.pointsUsed} / +${i.pointsEarned}`,
                  },
                  {
                    header: 'Trạng thái',
                    cell: (i) => (
                      <Badge tone={i.status === 'PAID' ? 'success' : 'danger'}>
                        {i.status === 'PAID' ? 'Đã thanh toán' : 'Đã hủy'}
                      </Badge>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        )}
      </QueryState>
    </Modal>
  )
}
