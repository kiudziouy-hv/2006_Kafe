import { QueryClient } from '@tanstack/react-query'

/** Lỗi 4xx là lỗi nghiệp vụ (hiện cho người dùng), không thử lại; chỉ thử lại lỗi mạng/5xx một lần. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      refetchOnWindowFocus: true,
      retry: (count, error) => {
        const status = (error as { response?: { status?: number } }).response?.status
        return count < 1 && (status === undefined || status >= 500)
      },
    },
  },
})
