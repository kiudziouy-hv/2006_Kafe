import { AppShell } from '@/components/layout/AppShell'
import { useOpsNotifications } from '@/hooks/useOpsNotifications'

/** Thu ngân (máy dùng chung): tự đăng xuất sau 5 phút không thao tác (UC-02). */
export default function CashierLayout() {
  useOpsNotifications('/topic/cashier')
  return <AppShell />
}
