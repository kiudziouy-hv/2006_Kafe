import { AppShell } from '@/components/layout/AppShell'
import { useOpsNotifications } from '@/hooks/useOpsNotifications'

/** Màn hình pha chế (máy dùng chung): đơn mới tự xuất hiện, không cần toast nên tắt thông báo. */
export default function KitchenLayout() {
  useOpsNotifications('/topic/kitchen', true)
  return <AppShell />
}
