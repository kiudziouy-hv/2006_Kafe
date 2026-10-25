import { useState } from 'react'
import { Panel, Table } from '../../components/Table'
import { Button, ConfirmDialog, DialogOverlay } from '../../components/ui'
import { useStore } from '../../store'
import OwnerLayout from './OwnerLayout'

// S53 — Chốt ngày kinh doanh (ASM-48: cần chốt hết phiên ca thu ngân, không còn đơn mở / bàn chưa Trống)
export default function CloseDay() {
  const { tables, orders, shift, setShift, drafts, toast } = useStore()
  const [morningClosed, setMorningClosed] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [done, setDone] = useState(false)

  const blockers = [
    ...tables
      .filter((t) => t.status !== 'free')
      .map((t) => {
        const lines = orders[t.id] ?? []
        const active = lines.find((l) => l.status === 'brewing') ? 'Còn món đang Making' : lines.find((l) => l.status === 'new') ? 'Còn món New' : 'Chưa ở trạng thái Trống'
        return { key: `t${t.id}`, target: t.name, detail: lines.length ? 'Đơn tại quán' : 'Bàn', reason: active }
      }),
    ...drafts.map((d) => ({ key: `d${d.id}`, target: d.id, detail: 'Đơn nháp chuyển khoản/QR', reason: 'Chưa xác nhận hoặc hủy' })),
  ]
  const shiftOpen = !morningClosed
  const canClose = !shiftOpen && blockers.length === 0 && !done

  const closeDay = () => {
    setConfirm(false)
    if (!canClose) return toast({ type: 'error', title: 'Chưa thể chốt ngày', message: `Còn ${blockers.length} mục chưa xử lý.` })
    setDone(true)
    toast({ type: 'success', title: 'Đã chốt ngày kinh doanh', message: 'Dữ liệu chấm công và hóa đơn trong ngày đã khóa.' })
  }

  return (
    <OwnerLayout title="Chốt ngày kinh doanh">
      {shiftOpen && (
        <div className="flex items-center gap-4 rounded-xl border border-border-default bg-bg-surface p-4">
          <div className="flex-1">
            <p className="text-base font-semibold">Chưa chốt ngày được: phiên ca thu ngân tối chưa chốt (ASM-48)</p>
            <p className="text-xs text-text-secondary">
              Ca sáng 07:00 – 14:30 · Thu ngân mẫu B · Tiền mặt đầu ca 500.000đ vẫn đang mở. Hãy chốt ca sáng (Chủ quán/Quản lý có thể chốt thay), rồi mở và chốt ca tối trước khi chốt ngày.
            </p>
          </div>
          <Button
            onClick={() => {
              setMorningClosed(true)
              setShift({ ...shift, open: false })
              toast({ type: 'success', title: 'Đã chốt ca', message: 'Đã chốt thay ca sáng của Thu ngân mẫu B.' })
            }}
          >
            Chốt thay ca sáng
          </Button>
        </div>
      )}
      {done ? (
        <Panel title="Ngày kinh doanh đã chốt">
          <p className="text-sm text-text-secondary">Dữ liệu hóa đơn, kho và chấm công của ngày 20/10/2026 đã khóa. Mọi chỉnh sửa sau đây sẽ bị chặn.</p>
        </Panel>
      ) : (
        <Panel title="Cần xử lý trước khi chốt">
          <Table
            rows={blockers}
            rowKey={(r) => r.key}
            empty="Không còn mục nào cần xử lý."
            cols={[
              { head: 'Đối tượng', cell: (r) => r.target },
              { head: 'Chi tiết', cell: (r) => r.detail },
              { head: 'Lý do chưa chốt được', cell: (r) => r.reason },
            ]}
          />
        </Panel>
      )}
      <div className="flex justify-end">
        <Button disabled={!canClose} onClick={() => setConfirm(true)}>
          Xác nhận chốt ngày
        </Button>
      </div>
      {confirm && (
        <DialogOverlay onClose={() => setConfirm(false)}>
          <ConfirmDialog title="Chốt ngày kinh doanh?" message="Sau khi chốt, hóa đơn và chấm công trong ngày sẽ bị khóa, không thể sửa.">
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Không
            </Button>
            <Button onClick={closeDay}>Chốt ngày</Button>
          </ConfirmDialog>
        </DialogOverlay>
      )}
    </OwnerLayout>
  )
}
