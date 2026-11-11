import type { ReactNode } from 'react'
import { toApiError } from '@/lib/http'
import { Button } from '../ui/Button'

interface Props {
  isPending: boolean
  error: unknown
  onRetry?: () => void
  children: ReactNode
}

/** Hiển thị trạng thái tải / lỗi chung cho các trang dùng dữ liệu từ API. */
export function QueryState({ isPending, error, onRetry, children }: Props) {
  if (isPending) return <p className="p-6 text-ink-soft">Đang tải…</p>
  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 p-6" role="alert">
        <p className="text-danger">{toApiError(error).message}</p>
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Thử lại
          </Button>
        )}
      </div>
    )
  }
  return <>{children}</>
}
