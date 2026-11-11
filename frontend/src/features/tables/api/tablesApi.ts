import { http } from '@/lib/http'
import type { DiningTable, Order } from '@/types/api'

export const tablesApi = {
  list: () => http.get<DiningTable[]>('/ops/tables').then((r) => r.data),
  /** UC-11: khách dùng xong, chuyển bàn sang Chờ thanh toán */
  finish: (orderId: number) =>
    http.post<Order>(`/ops/orders/${orderId}/finish`).then((r) => r.data),
}
