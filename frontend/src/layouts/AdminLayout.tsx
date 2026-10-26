import { BarChart3, BookOpen, Crown, Package, Receipt, Armchair, UsersRound } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { AppShell, type NavItem } from '@/components/layout/AppShell'
import type { NotifExtra } from '@/components/layout/NotificationBell'
import { inventoryApi } from '@/features/inventory/api/inventoryApi'
import { useOpsNotifications } from '@/hooks/useOpsNotifications'

export const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Báo cáo', end: true, icon: BarChart3 },
  { to: '/admin/menu', label: 'Thực đơn', icon: BookOpen },
  { to: '/admin/tables', label: 'Bàn', icon: Armchair },
  { to: '/admin/invoices', label: 'Hóa đơn', icon: Receipt },
  { to: '/admin/inventory', label: 'Kho', icon: Package },
  { to: '/admin/customers', label: 'Thành viên', icon: Crown },
  { to: '/admin/staff', label: 'Nhân sự & ca', icon: UsersRound },
]

/** Chủ quán / Quản lý: thanh bên đầy đủ; kế thừa quyền ba vai trò còn lại nên vẫn mở được /service, /cashier, /kitchen. */
export default function AdminLayout() {
  // Chủ quán thấy mọi sự kiện vận hành (không hiện toast, chỉ vào chuông) và cảnh báo kho.
  useOpsNotifications('/topic/cashier', true)
  useOpsNotifications('/topic/kitchen', true)
  useOpsNotifications('/topic/service', true)
  const alerts = useQuery({
    queryKey: ['inventory', 'alerts'],
    queryFn: inventoryApi.alerts,
    refetchInterval: 60_000,
  })
  const extras: NotifExtra[] = []
  const low = alerts.data?.lowStock ?? []
  const expiring = alerts.data?.expiring ?? []
  if (low.length > 0)
    extras.push({
      id: 'low',
      title: `${low.length} nguyên liệu dưới mức tồn tối thiểu`,
      description: low.map((l) => l.name).join(', '),
      to: '/admin/inventory',
    })
  if (expiring.length > 0)
    extras.push({
      id: 'exp',
      title: `${expiring.length} lô sắp hết hạn sử dụng`,
      description: expiring.map((e) => e.ingredient).join(', '),
      to: '/admin/inventory',
    })
  return <AppShell sidebar nav={ADMIN_NAV} extras={extras} />
}
