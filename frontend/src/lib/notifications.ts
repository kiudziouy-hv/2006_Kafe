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

/** Cảnh báo cố định (vd. kho) do giao diện tự tính nên không xóa được; chỉ ghi nhớ trong phiên là đã đọc hoặc đã ẩn. */
export interface ExtraState {
  read: string[]
  hidden: string[]
}
const EXTRA_KEY = 'vt-notif-extras'
const EMPTY_EXTRA: ExtraState = { read: [], hidden: [] }

function loadExtra(): ExtraState {
  try {
    const raw = sessionStorage.getItem(EXTRA_KEY)
    return raw ? (JSON.parse(raw) as ExtraState) : EMPTY_EXTRA
  } catch {
    return EMPTY_EXTRA
  }
}

let items: Notif[] = load()
let extra: ExtraState = loadExtra()

function commit(next: Notif[]) {
  items = next
  try {
    sessionStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    /* không lưu được thì chỉ giữ trong bộ nhớ */
  }
  listeners.forEach((l) => l())
}

function commitExtra(next: ExtraState) {
  extra = next
  try {
    sessionStorage.setItem(EXTRA_KEY, JSON.stringify(extra))
  } catch {
    /* không lưu được thì chỉ giữ trong bộ nhớ */
  }
  listeners.forEach((l) => l())
}

const union = (a: string[], b: string[]) => [...new Set([...a, ...b])]

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
  /** Đánh dấu đã đọc các cảnh báo cố định (khóa = id + tiêu đề, nên cảnh báo đổi nội dung sẽ hiện lại). */
  readExtras(keys: string[]) {
    commitExtra({ ...extra, read: union(extra.read, keys) })
  },
  hideExtras(keys: string[]) {
    commitExtra({ read: union(extra.read, keys), hidden: union(extra.hidden, keys) })
  },
  /** Xóa mọi thứ, dùng khi đăng xuất. */
  reset() {
    commit([])
    commitExtra(EMPTY_EXTRA)
  },
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
  snapshot: () => items,
  extraSnapshot: () => extra,
}

export function useNotifications() {
  return useSyncExternalStore(notifications.subscribe, notifications.snapshot)
}

export function useExtraState() {
  return useSyncExternalStore(notifications.subscribe, notifications.extraSnapshot)
}
