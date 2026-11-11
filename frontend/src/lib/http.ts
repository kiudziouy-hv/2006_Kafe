import axios, { AxiosError } from 'axios'
import type { ApiError } from '@/types/api'

/** Phiên đăng nhập là cookie của máy chủ (VTPHSESSION), nên luôn gửi kèm thông tin xác thực. */
export const http = axios.create({ baseURL: '/api', withCredentials: true, timeout: 15000 })

type UnauthorizedListener = () => void
const listeners = new Set<UnauthorizedListener>()

/** Đăng ký hàm chạy khi bất kỳ API nào trả 401 (hết phiên): AuthProvider dùng để đưa về trang đăng nhập. */
export function onUnauthorized(fn: UnauthorizedListener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

http.interceptors.response.use(
  (r) => r,
  (error: AxiosError<ApiError>) => {
    const isAuthCall = error.config?.url?.startsWith('/auth/')
    if (error.response?.status === 401 && !isAuthCall) listeners.forEach((fn) => fn())
    return Promise.reject(error)
  },
)

/** Lấy lỗi nghiệp vụ {code, message} từ phản hồi; lỗi mạng trả thông điệp chung. */
export function toApiError(e: unknown): ApiError {
  if (axios.isAxiosError<ApiError>(e)) {
    if (e.response?.data?.message) return e.response.data
    if (!e.response)
      return { code: 'NETWORK', message: 'Không kết nối được máy chủ. Vui lòng thử lại.' }
    return { code: `HTTP_${e.response.status}`, message: 'Thao tác không thành công.' }
  }
  return { code: 'UNKNOWN', message: 'Đã xảy ra lỗi không xác định.' }
}
