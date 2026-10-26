import { useQuery } from '@tanstack/react-query'
import { QueryState } from '@/components/feedback/QueryState'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { formatDate } from '@/utils/format'
import { inventoryApi, num } from '../api/inventoryApi'

/** UC-21: nguyên liệu dưới mức tồn tối thiểu và phiếu nhập sữa tươi/bánh từ 2 ngày trước hạn dùng. */
export function AlertsTab() {
  const alerts = useQuery({ queryKey: ['inventory', 'alerts'], queryFn: inventoryApi.alerts })
  return (
    <QueryState
      isPending={alerts.isPending}
      error={alerts.error}
      onRetry={() => void alerts.refetch()}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-lg font-bold">Tồn kho thấp</h2>
          <DataTable
            rows={alerts.data?.lowStock ?? []}
            rowKey={(r) => r.id}
            empty="Không có nguyên liệu nào dưới mức tối thiểu."
            columns={[
              { header: 'Nguyên liệu', cell: (r) => r.name },
              { header: 'Tồn hiện tại', cell: (r) => `${num(r.currentStock)} ${r.unit}` },
              { header: 'Tối thiểu', cell: (r) => `${num(r.minStock)} ${r.unit}` },
            ]}
          />
        </Card>
        <Card>
          <h2 className="mb-2 text-lg font-bold">Sắp hết hạn sử dụng</h2>
          <DataTable
            rows={alerts.data?.expiring ?? []}
            rowKey={(r) => r.id}
            empty="Không có phiếu nhập nào sắp hết hạn."
            columns={[
              { header: 'Nguyên liệu', cell: (r) => r.ingredient },
              { header: 'Hạn dùng', cell: (r) => formatDate(r.expiryDate) },
              {
                header: 'Còn lại',
                cell: (r) =>
                  r.daysLeft < 0 ? (
                    <Badge tone="danger">Quá hạn</Badge>
                  ) : (
                    <Badge tone="warning">{r.daysLeft} ngày</Badge>
                  ),
              },
              { header: 'Cần kiểm tra', cell: (r) => num(r.quantityToCheck) },
            ]}
          />
        </Card>
      </div>
    </QueryState>
  )
}
