import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/feedback/Toaster'
import type { OpsMessage } from '@/types/api'
import { notifications } from '@/lib/notifications'
import { useTopic } from './useTopic'

export function describeOps(m: OpsMessage): {
  title: string
  description?: string
  tone: 'success' | 'info' | 'warning'
} {
  switch (m.type) {
    case 'LINE_DONE':
      return {
        tone: 'success',
        title: `${m.label} xong, cần mang ra`,
        description: `${m.name ?? 'Món'} đã sẵn sàng.`,
      }
    case 'LINE_MAKING':
      return { tone: 'info', title: `${m.label}: bắt đầu pha`, description: m.name }
    case 'TABLE_WAITING_PAY':
      return { tone: 'info', title: `${m.label} chờ thanh toán` }
    case 'LINE_SHORTAGE':
      return {
        tone: 'warning',
        title: `${m.label}: thiếu nguyên liệu`,
        description: `${m.name ?? 'Món'} chưa thể pha, chờ bổ sung hoặc hủy.`,
      }
    case 'ORDER_PAID':
      return { tone: 'success', title: `${m.label} đã thanh toán` }
    case 'LINE_CANCELLED':
      return { tone: 'info', title: `${m.label}: món đã hủy`, description: m.name }
    default:
      return { tone: 'info', title: `${m.label}: có đơn mới`, description: m.name }
  }
}

/** Nhận thông báo của một kênh, hiện toast và làm mới dữ liệu vận hành (UC-14). */
export function useOpsNotifications(topic: string, silent = false) {
  const qc = useQueryClient()
  const { notify } = useToast()
  const refresh = () => void qc.invalidateQueries({ queryKey: ['ops'] })
  useTopic<OpsMessage>(
    topic,
    (m) => {
      refresh()
      const d = describeOps(m)
      notifications.add({
        id: `${m.type}|${m.orderId}|${m.name ?? ''}|${m.at}`,
        tone: d.tone,
        title: d.title,
        description: d.description,
        at: m.at,
      })
      if (!silent) notify(d)
    },
    refresh,
  )
}
