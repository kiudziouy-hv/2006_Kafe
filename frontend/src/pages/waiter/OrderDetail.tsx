import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import OrderLineCard from '../../components/OrderLineCard'
import { AppHeader, Button, ConfirmDialog, DialogOverlay, NotificationBell, Screen, TextField } from '../../components/ui'
import { useStore, type OrderLine } from '../../store'

// S13 — Chi tiết đơn của bàn; S13b — Chờ thanh toán; S15/S15b/S15c — Hủy món
export default function OrderDetail() {
  const { id } = useParams()
  const tableId = Number(id)
  const navigate = useNavigate()
  const { tables, orders, setTableStatus, updateLine, toast } = useStore()
  const table = tables.find((t) => t.id === tableId)
  const lines = (orders[tableId] ?? []).filter((l) => l.status !== 'cancelled')
  const [cancelMode, setCancelMode] = useState(false)
  const [target, setTarget] = useState<OrderLine | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')

  if (!table) return <Screen>Không tìm thấy bàn.</Screen>
  const waiting = table.status === 'waiting'
  const allDone = lines.length > 0 && lines.every((l) => l.status === 'done')
  const brewing = target?.status === 'brewing'

  const confirmCancel = () => {
    if (!target) return
    if (brewing && !reason.trim()) {
      setReasonError('Bắt buộc nhập lý do hủy.')
      toast({ type: 'error', title: 'Chưa nhập lý do hủy', message: 'Món đang pha cần lý do để ghi hao hụt.' })
      return
    }
    updateLine(tableId, target.id, { status: 'cancelled' })
    toast({ type: 'success', title: brewing ? 'Đã hủy món đang pha' : 'Đã hủy món', message: `${target.qty}× ${target.name}` })
    setTarget(null)
    setCancelMode(false)
    setReason('')
    setReasonError('')
  }

  const pickToCancel = (l: OrderLine) => {
    if (l.status === 'done') {
      toast({ type: 'error', title: 'Không thể hủy món', message: 'Món đã hoàn thành, không thể hủy.' })
      return
    }
    setTarget(l)
  }

  return (
    <Screen>
      <AppHeader title={`${table.name} · ${waiting ? 'Chờ thanh toán' : 'Đang phục vụ'}`} back="/phuc-vu" right={<NotificationBell />} />
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-3 p-4">
        {cancelMode && <p className="text-sm font-semibold">Chọn món cần hủy</p>}
        {lines.map((l) => (
          <OrderLineCard key={l.id} line={l} onClick={cancelMode ? () => pickToCancel(l) : undefined} />
        ))}
        {lines.length === 0 && <p className="text-sm text-text-secondary">Bàn chưa có món nào.</p>}

        {!waiting && (
          <Button variant="destructive-text" block onClick={() => setCancelMode(!cancelMode)}>
            {cancelMode ? 'Thôi, không hủy' : 'Hủy món'}
          </Button>
        )}
        <Button
          block
          onClick={() => {
            if (waiting) setTableStatus(tableId, 'busy')
            navigate(`/phuc-vu/ban/${tableId}/goi-mon`)
          }}
        >
          + Gọi thêm món
        </Button>
        <Button variant="secondary" block onClick={() => navigate(`/phuc-vu/ban/${tableId}/chuyen-ban`)}>
          Chuyển bàn
        </Button>
        {!waiting && (
          <Button
            block
            disabled={!allDone}
            onClick={() => {
              setTableStatus(tableId, 'waiting')
              toast({ type: 'success', title: `${table.name} chờ thanh toán`, message: 'Thu ngân đã nhận được yêu cầu thanh toán.' })
            }}
          >
            Khách đã dùng xong
          </Button>
        )}
        {waiting && (
          <p className="text-xs">Gọi thêm món sẽ đưa bàn về Đang phục vụ. Chuyển bàn vẫn được: bàn đích sẽ ở trạng thái Chờ thanh toán.</p>
        )}
      </div>

      {target && (
        <DialogOverlay onClose={() => setTarget(null)}>
          <ConfirmDialog
            title={brewing ? 'Hủy món đang pha?' : 'Hủy món này?'}
            message={
              <div className="flex flex-col gap-3">
                <p>
                  {brewing
                    ? `${target.qty}× ${target.name} (Đang pha). Nguyên liệu đã trừ kho nên không hoàn kho, ghi hao hụt "hủy món". Chỉ Chủ quán/Quản lý được hủy, bắt buộc nhập lý do.`
                    : `${target.qty}× ${target.name} (Mới).${target.isCake ? ' Bánh đã trừ kho khi gửi đơn sẽ được cộng lại.' : ''}`}
                </p>
                {brewing && (
                  <div className="text-left text-text-primary">
                    <TextField label="Lý do hủy" placeholder="VD: Khách đổi ý" value={reason} error={reasonError} onChange={(e) => setReason(e.target.value)} />
                  </div>
                )}
              </div>
            }
          >
            <Button variant="secondary" onClick={() => setTarget(null)}>
              Không
            </Button>
            <Button variant="destructive" onClick={confirmCancel}>
              Hủy món
            </Button>
          </ConfirmDialog>
        </DialogOverlay>
      )}
    </Screen>
  )
}
