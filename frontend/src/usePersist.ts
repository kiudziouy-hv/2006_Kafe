import { useState } from 'react'

// Giữ dữ liệu giả của từng màn trong phiên làm việc (không mất khi chuyển trang).
const cache = new Map<string, unknown>()

export function usePersist<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => (cache.has(key) ? (cache.get(key) as T) : initial))
  const set = (next: T | ((prev: T) => T)) =>
    setValue((prev) => {
      const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
      cache.set(key, v)
      return v
    })
  return [value, set] as const
}
