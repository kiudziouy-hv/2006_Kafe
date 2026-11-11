const prefix = '[vtph]'

/** Ghi log ra console; chỉ ghi chi tiết khi chạy `npm run dev`. Không bao giờ ghi PIN hay mật khẩu. */
export const logger = {
  debug: (...a: unknown[]) => import.meta.env.DEV && console.debug(prefix, ...a),
  warn: (...a: unknown[]) => console.warn(prefix, ...a),
  error: (...a: unknown[]) => console.error(prefix, ...a),
}
