import { AppShell } from '@/components/layout/AppShell'
import { useOpsNotifications } from '@/hooks/useOpsNotifications'

/** Phục vụ (điện thoại/máy tính bảng): nhận thông báo món xong từ pha chế (UC-14). */
export default function ServiceLayout() {
  useOpsNotifications('/topic/service')
  return <AppShell />
}
