import { useEffect } from 'react'

const EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const

/** UC-02: máy dùng chung (Thu ngân, Pha chế) tự đăng xuất sau `seconds` giây không thao tác. 0 = tắt. */
export function useIdleLogout(seconds: number, onIdle: () => void) {
  useEffect(() => {
    if (seconds <= 0) return
    let timer = window.setTimeout(onIdle, seconds * 1000)
    const reset = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(onIdle, seconds * 1000)
    }
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    return () => {
      window.clearTimeout(timer)
      EVENTS.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [seconds, onIdle])
}
