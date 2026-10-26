import { useSyncExternalStore } from 'react'

export type NotifTone = 'success' | 'info' | 'warning'

export interface Notif {
  id: string
  tone: NotifTone
  title: string
  description?: string
  at: string
  read: boolean
}

const KEY = 'vt-notifs'
const MAX = 50
const listeners = new Set<() => void>()

function load(): Notif[] {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Notif[]) : []
  } catch {
    return []
  }
}

let items: Notif[] = load()

function commit(next: Notif[]) {
  items = next
  try {
    sessionStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    /* không lưu được thì chỉ giữ trong bộ nhớ */
  }
  listeners.forEach((l) => l())
}

/** Kho thông báo trong phiên: nhận từ các kênh thời gian thực, hiển thị ở chuông trên thanh tiêu đề. */
export const notifications = {
  /** Thêm thông báo; bỏ qua nếu đã có cùng id (một sự kiện có thể về qua nhiều kênh). */
  add(n: Omit<Notif, 'read'>) {
    if (items.some((x) => x.id === n.id)) return
    commit([{ ...n, read: false }, ...items].slice(0, MAX))
  },
  markAllRead() {
    if (items.some((x) => !x.read)) commit(items.map((x) => ({ ...x, read: true })))
  },
  clear() {
    commit([])
  },
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
  snapshot: () => items,
}

export function useNotifications() {
  return useSyncExternalStore(notifications.subscribe, notifications.snapshot)
}
