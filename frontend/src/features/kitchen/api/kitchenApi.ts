import { http } from '@/lib/http'
import type { KitchenLine } from '@/types/api'

export const kitchenApi = {
  board: () => http.get<{ lines: KitchenLine[] }>('/ops/kitchen').then((r) => r.data.lines),
  start: (lineId: number) => http.post(`/ops/kitchen/${lineId}/start`).then((r) => r.data),
  done: (lineId: number) => http.post(`/ops/kitchen/${lineId}/done`).then((r) => r.data),
}
