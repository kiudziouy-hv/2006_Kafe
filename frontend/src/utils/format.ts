const vnd = new Intl.NumberFormat('vi-VN')

/** 76000 -> "76.000đ" */
export function formatMoney(amount: number): string {
  return `${vnd.format(amount)}đ`
}

/** Giờ:phút từ chuỗi ISO, theo múi giờ của máy */
export function formatClock(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '--:--'
    : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export const ROLE_LABEL = {
  OWNER: 'Chủ quán / Quản lý',
  WAITER: 'Phục vụ',
  CASHIER: 'Thu ngân',
  BARISTA: 'Pha chế',
} as const

/** Ngày giờ đầy đủ theo múi giờ của máy: "25/10/2026 14:30". */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}

/** "2026-10-25" -> "25/10/2026" */
export function formatDate(day: string | null | undefined): string {
  if (!day) return '—'
  const [y, m, d] = day.split('-')
  return `${d}/${m}/${y}`
}

/** Ngày hôm nay (múi giờ máy) dạng yyyy-MM-dd, dùng cho ô chọn ngày. */
export function todayIso(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Số hóa đơn dạng "HD0003" đã do backend sinh; nhãn đơn: "Bàn 3" hoặc "#002". */
export function orderLabel(o: {
  orderType: string
  tableNo: number | null
  queueNumber: number | null
}): string {
  return o.orderType === 'DINE_IN'
    ? `Bàn ${o.tableNo}`
    : `#${String(o.queueNumber ?? 0).padStart(3, '0')}`
}

export const GROUP_LABEL: Record<string, string> = {
  COFFEE: 'Coffee',
  TEA: 'Tea',
  SMOOTHIE: 'Sinh tố',
  CAKE: 'Cake',
}

export const SHIFT_LABEL: Record<string, string> = { MORNING: 'Ca sáng', EVENING: 'Ca tối' }
