import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TextAreaField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'

/** Hộp thoại nhập lý do bắt buộc (hủy hóa đơn, hủy dòng món…). */
export function ReasonDialog({
  title,
  confirmLabel,
  loading,
  onConfirm,
  onClose,
}: {
  title: string
  confirmLabel: string
  loading?: boolean
  onConfirm: (reason: string) => void
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  return (
    <Modal title={title} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <TextAreaField
          label="Lý do (bắt buộc)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
          <Button
            variant="danger"
            disabled={!reason.trim()}
            loading={loading}
            onClick={() => onConfirm(reason.trim())}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
