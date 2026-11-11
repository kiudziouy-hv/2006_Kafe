import { useEffect, useRef, useSyncExternalStore } from 'react'
import { realtime } from '@/lib/websocket'

/** Trạng thái kết nối thời gian thực, để hiển thị chấm trạng thái trên thanh tiêu đề. */
export function useConnectionState() {
  return useSyncExternalStore(realtime.subscribeState, realtime.getState)
}

/**
 * Lắng nghe một kênh STOMP. `onRefetch` chạy khi mất kết nối rồi nối lại, để tải lại dữ liệu từ REST
 * (WebSocket chỉ báo thay đổi, không thay thế API).
 */
export function useTopic<T>(topic: string, onMessage: (m: T) => void, onRefetch?: () => void) {
  const msgRef = useRef(onMessage)
  const refetchRef = useRef(onRefetch)
  useEffect(() => {
    msgRef.current = onMessage
    refetchRef.current = onRefetch
  })
  useEffect(
    () =>
      realtime.subscribe(
        topic,
        (m) => msgRef.current(m as T),
        () => refetchRef.current?.(),
      ),
    [topic],
  )
}
