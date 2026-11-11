import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import TableCard from '../../components/TableCard'
import { AppHeader, Button, EmptyState, NotificationBell, Screen } from '../../components/ui'
import { useStore } from '../../store'

// S14 — Chuyển bàn; S14b — không còn bàn Trống
export default function TransferTable() {
  const { id } = useParams()
  const tableId = Number(id)
  const navigate = useNavigate()
  const { tables, moveOrder, toast } = useStore()
  const table = tables.find((t) => t.id === tableId)
  const free = tables.filter((t) => t.status === 'free')
  const [to, setTo] = useState<number | null>(null)
  const target = tables.find((t) => t.id === to)

  useEffect(() => {
    if (free.length === 0) toast({ type: 'error', title: 'Không thể chuyển bàn', message: 'Không có bàn nào đang Trống.' })
    // chỉ báo một lần khi mở màn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!table) return <Screen>Không tìm thấy bàn.</Screen>

  const choose = (tid: number) => {
    setTo(tid)
    toast({ type: 'info', title: `Đã chọn Bàn ${tid}`, message: 'Đơn sẽ được chuyển sang bàn này.' })
  }

  const confirm = () => {
    if (!to) return
    moveOrder(tableId, to)
    toast({ type: 'success', title: 'Đã chuyển bàn', message: `Đơn của ${table.name} đã chuyển sang Bàn ${to}.` })
    navigate(`/phuc-vu/ban/${to}`, { replace: true })
  }

  return (
    <Screen>
      <AppHeader title="Chuyển bàn" back right={<NotificationBell />} />
      <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col justify-center gap-3 p-4">
        <p className="text-base font-semibold">Chuyển đơn của {table.name} sang bàn đang Trống</p>
        {free.length === 0 ? (
          <EmptyState title="Không còn bàn Trống" message="Hiện không thể chuyển bàn. Hãy thử lại khi có bàn Trống." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {free.map((t) => (
              <TableCard key={t.id} table={t} selected={to === t.id} onClick={() => choose(t.id)} />
            ))}
          </div>
        )}
      </div>
      <div className="sticky bottom-3 mx-auto flex w-full max-w-[720px] gap-2 rounded-2xl border border-glass-stroke bg-glass-fill px-4 py-3 shadow-glass backdrop-blur-md">
        <Button variant="destructive-text" onClick={() => navigate(-1)}>
          Hủy
        </Button>
        <Button className="flex-1" disabled={!target} onClick={confirm}>
          {target ? `Xác nhận chuyển sang ${target.name}` : 'Chọn bàn đích'}
        </Button>
      </div>
    </Screen>
  )
}
