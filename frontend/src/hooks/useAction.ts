import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useToast } from '@/components/feedback/Toaster'
import { toApiError } from '@/lib/http'

interface Options<V, R> {
  /** Khóa truy vấn cần tải lại sau khi thành công (khớp theo tiền tố). */
  invalidate?: QueryKey[]
  success?: string | ((result: R, vars: V) => string)
  onDone?: (result: R, vars: V) => void
}

/** Mutation có sẵn toast lỗi theo thông điệp backend, toast thành công và làm mới dữ liệu liên quan. */
export function useAction<V, R>(fn: (vars: V) => Promise<R>, opts: Options<V, R> = {}) {
  const qc = useQueryClient()
  const { notify } = useToast()
  return useMutation({
    mutationFn: fn,
    onSuccess: (result, vars) => {
      opts.invalidate?.forEach((key) => void qc.invalidateQueries({ queryKey: key }))
      if (opts.success) {
        notify({
          tone: 'success',
          title: typeof opts.success === 'function' ? opts.success(result, vars) : opts.success,
        })
      }
      opts.onDone?.(result, vars)
    },
    onError: (e) =>
      notify({ tone: 'danger', title: 'Không thực hiện được', description: toApiError(e).message }),
  })
}
