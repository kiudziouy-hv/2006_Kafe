import { useMemo, useState } from 'react'
import { lineBadge } from '../../components/OrderLineCard'
import TopNav from '../../components/TopNav'
import WasteForm from '../../components/WasteForm'
import { Badge, Button } from '../../components/ui'
import { useStore, type LineStatus } from '../../store'

type Ticket = { key: string; source: string; tableId?: number; lineId?: string; qty: number; name: string; options: string; sentAt: string; status: LineStatus; isCake?: boolean; blocked?: boolean }

// Đơn mang đi giả lập trên quầy pha chế
const TAKEAWAY: Ticket[] = [
  { key: 't3', source: '#003', qty: 2, name: 'Món mẫu 2 · L · Lạnh', options: '30% đường · bình thường', sentAt: '10:44', status: 'new', blocked: true },
  { key: 't2', source: '#002', qty: 1, name: 'Món mẫu 3 · M · Lạnh', options: '0% đường · không đá', sentAt: '10:40', status: 'brewing' },
  { key: 't1', source: '001', qty: 1, name: 'Bánh mẫu 2', options: 'Bánh', sentAt: '10:31', status: 'done', isCake: true },
]

// S30 — Màn hình pha chế (S30a–d: bắt đầu pha / hoàn thành / lấy bánh); S31 — đề xuất hao hụt
export default function Barista() {
  const { tables, orders, updateLine, toast, addWaste } = useStore()
  const [takeaway, setTakeaway] = useState(TAKEAWAY)
  const [waste, setWaste] = useState(false)

  const tickets = useMemo(() => {
    const fromTables: Ticket[] = Object.entries(orders).flatMap(([tid, lines]) =>
      lines
        .filter((l) => l.status !== 'cancelled')
        .map((l) => ({
          key: l.id, source: tables.find((t) => t.id === Number(tid))?.name ?? `Bàn ${tid}`, tableId: Number(tid), lineId: l.id,
          qty: l.qty, name: l.name, options: l.isCake ? 'Bánh · không cần pha' : l.options, sentAt: l.sentAt, status: l.status, isCake: l.isCake,
        })),
    )
    return [...fromTables, ...takeaway].sort((a, b) => a.sentAt.localeCompare(b.sentAt))
  }, [orders, tables, takeaway])

  const move = (t: Ticket, status: LineStatus) => {
    if (t.blocked) {
      toast({ type: 'error', title: 'Thiếu nguyên liệu: Sữa tươi', message: 'Chưa thể bắt đầu pha món này.' })
      return
    }
    if (t.tableId != null && t.lineId) updateLine(t.tableId, t.lineId, { status })
    else setTakeaway((xs) => xs.map((x) => (x.key === t.key ? { ...x, status } : x)))
    if (status === 'brewing') toast({ type: 'success', title: t.isCake ? 'Đã bắt đầu lấy bánh' : 'Đã bắt đầu pha', message: `${t.source} · ${t.qty}× ${t.name}` })
    else toast({ type: 'success', title: 'Món đã hoàn thành', message: `${t.source} · đã báo Phục vụ/Thu ngân.` })
  }

  const cols: { status: LineStatus; title: string }[] = [
    { status: 'new', title: 'Mới' },
    { status: 'brewing', title: 'Đang pha' },
    { status: 'done', title: 'Hoàn thành gần đây' },
  ]

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-bg-canvas p-4">
      <TopNav title="Màn hình pha chế" user="Pha chế mẫu A" role="Pha chế" />
      <div className="px-6 py-3">
        <Button variant="secondary" onClick={() => setWaste(true)}>
          Đề xuất hao hụt
        </Button>
      </div>
      <div className="grid flex-1 animate-page-in gap-4 px-6 pb-4 md:grid-cols-3">
        {cols.map((c) => {
          const list = tickets.filter((t) => t.status === c.status)
          return (
            <section key={c.status} className="flex flex-col gap-3 rounded-xl bg-bg-subtle p-4">
              <h2 className="text-base font-semibold">
                {c.title} ({list.length}){c.status === 'new' ? ' · FIFO' : ''}
              </h2>
              {list.map((t) => (
                <div key={t.key} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2 rounded-xl border border-border-default bg-bg-surface p-4">
                    <div className="flex items-start gap-2">
                      <p className="flex-1 text-sm font-semibold">
                        {t.source} · {t.sentAt} — {t.qty}× {t.name}
                      </p>
                      <Badge label={lineBadge[t.status].label} tone={lineBadge[t.status].tone} />
                    </div>
                    <p className="text-xs text-text-secondary">{t.options}</p>
                    {t.status === 'new' && (
                      <Button block disabled={t.blocked} onClick={() => move(t, 'brewing')}>
                        {t.isCake ? 'Bắt đầu lấy bánh' : 'Bắt đầu pha'}
                      </Button>
                    )}
                    {t.status === 'brewing' && (
                      <Button block onClick={() => move(t, 'done')}>
                        Hoàn thành
                      </Button>
                    )}
                  </div>
                  {t.blocked && t.status === 'new' && (
                    <p className="rounded-[10px] border border-error-fg bg-error-bg px-3 py-2 text-xs text-error-fg">Thiếu Sữa tươi → Món mẫu 2 · size L tự chuyển sang Hết hàng</p>
                  )}
                </div>
              ))}
            </section>
          )
        })}
      </div>

      {waste && (
        <WasteForm
          title="Lập phiếu đề xuất hao hụt"
          submitLabel="Gửi đề xuất"
          by="Pha chế mẫu A"
          status="proposed"
          note='Phiếu ở trạng thái "Đề xuất". Chủ quán/Quản lý xác nhận hoặc từ chối; kho chỉ bị trừ khi phiếu được xác nhận.'
          onClose={() => setWaste(false)}
          onDone={(w) => {
            addWaste(w)
            setWaste(false)
            toast({ type: 'success', title: 'Đã gửi đề xuất hao hụt', message: `${w.ingredient} · ${w.qty} ${w.unit} · chờ Chủ quán xác nhận.` })
          }}
        />
      )}
    </div>
  )
}
