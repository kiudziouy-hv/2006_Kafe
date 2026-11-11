import { useState } from 'react'
import { Chip, Modal, Button, TextField, DateField } from '../../components/ui'
import { Panel } from '../../components/Table'
import { useStore } from '../../store'
import OwnerLayout from './OwnerLayout'
import iRevenue from '../../assets/icons/kpi-revenue.svg'
import iInvoices from '../../assets/icons/kpi-invoices.svg'
import iItems from '../../assets/icons/kpi-items.svg'

type Range = 'today' | 'yesterday' | '7d' | 'month' | 'custom'

const DATA: Record<Exclude<Range, 'custom'>, { revenue: number; invoices: number; items: number; bars: number[]; top: [string, number, number][] }> = {
  today: { revenue: 4250000, invoices: 52, items: 118, bars: [90, 120, 70, 150, 110, 180, 130], top: [['Món mẫu 1', 24, 840000], ['Món mẫu 2', 19, 760000], ['Món mẫu 3', 15, 675000], ['Bánh mẫu 1', 12, 360000], ['Món mẫu 5', 10, 420000]] },
  yesterday: { revenue: 3870000, invoices: 47, items: 101, bars: [80, 100, 95, 120, 140, 160, 110], top: [['Món mẫu 2', 21, 840000], ['Món mẫu 1', 18, 630000], ['Bánh mẫu 1', 14, 420000], ['Món mẫu 3', 9, 405000], ['Trà mẫu 1', 7, 266000]] },
  '7d': { revenue: 28400000, invoices: 341, items: 802, bars: [120, 150, 90, 170, 140, 190, 160], top: [['Món mẫu 1', 160, 5600000], ['Món mẫu 2', 131, 5240000], ['Món mẫu 3', 98, 4410000], ['Bánh mẫu 1', 86, 2580000], ['Món mẫu 5', 70, 2940000]] },
  month: { revenue: 96300000, invoices: 1180, items: 2760, bars: [140, 130, 120, 160, 150, 190, 170], top: [['Món mẫu 1', 540, 18900000], ['Món mẫu 2', 470, 18800000], ['Món mẫu 3', 360, 16200000], ['Bánh mẫu 1', 300, 9000000], ['Trà mẫu 1', 220, 8360000]] },
}
const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const EMPTY = { revenue: 0, invoices: 0, items: 0, bars: [] as number[], top: [] as [string, number, number][] }

// S54 — Báo cáo doanh thu; S54c — khoảng thời gian không hợp lệ; S54d — không có hóa đơn
export default function Report() {
  const { toast } = useStore()
  const [range, setRange] = useState<Range>('today')
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null)
  const [picking, setPicking] = useState(false)
  const [from, setFrom] = useState('2026-10-18')
  const [to, setTo] = useState('2026-10-20')

  const d = range === 'custom' ? (custom && custom.from < '2026-10-01' ? EMPTY : DATA['7d']) : DATA[range]
  const max = Math.max(...d.bars, 1)
  const peak = d.bars.indexOf(Math.max(...d.bars))

  const applyCustom = () => {
    if (!from || !to || from > to) {
      toast({ type: 'error', title: 'Khoảng thời gian không hợp lệ', message: 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.' })
      return
    }
    setCustom({ from, to })
    setRange('custom')
    setPicking(false)
    if (from < '2026-10-01') toast({ type: 'info', title: 'Không có dữ liệu', message: 'Chưa có hóa đơn nào trong khoảng thời gian đã chọn.' })
  }

  const fmt = (s: string) => s.split('-').reverse().slice(0, 2).join('/')

  return (
    <OwnerLayout title="Báo cáo bán hàng và doanh thu">
      <div className="flex flex-wrap gap-2">
        <Chip label="Hôm nay" selected={range === 'today'} onClick={() => setRange('today')} />
        <Chip label="Hôm qua" selected={range === 'yesterday'} onClick={() => setRange('yesterday')} />
        <Chip label="7 ngày qua" selected={range === '7d'} onClick={() => setRange('7d')} />
        <Chip label="Tháng hiện tại" selected={range === 'month'} onClick={() => setRange('month')} />
        <Chip label={custom ? `${fmt(custom.from)} → ${fmt(custom.to)}` : 'Tùy chọn…'} selected={range === 'custom'} onClick={() => setPicking(true)} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Kpi icon={iRevenue} label="Tổng doanh thu" value={d.revenue.toLocaleString('vi-VN') + 'đ'} />
        <Kpi icon={iInvoices} label="Số hóa đơn" value={String(d.invoices)} />
        <Kpi icon={iItems} label="Số sản phẩm đã bán" value={String(d.items)} />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <Panel title="Doanh thu theo ngày" className="lg:flex-[3]">
          {d.bars.length ? (
            <div className="flex h-[200px] items-end gap-4">
              {d.bars.map((h, i) => (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <div
                    title={`${DAYS[i]}: ${Math.round((h / max) * d.revenue / 7).toLocaleString('vi-VN')}đ`}
                    className={`w-10 rounded-t-sm ${i === peak ? 'bg-action-primary' : 'bg-border-default'}`}
                    style={{ height: `${(h / max) * 180}px` }}
                  />
                  <span className="text-[11px] text-text-secondary">{DAYS[i]}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="min-h-[200px] text-sm text-text-secondary">Không có dữ liệu trong khoảng thời gian đã chọn.</p>
          )}
        </Panel>
        <Panel title="Món bán chạy" className="lg:min-h-[547px] lg:flex-[2]">
          {d.top.length ? (
            d.top.map(([name, qty, amount], i) => (
              <div key={name} className="flex py-2 text-sm">
                <span className="flex-1">
                  {i + 1}. {name} · {qty} phần
                </span>
                <span>{amount.toLocaleString('vi-VN')}đ</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-text-secondary">Chưa có món nào được bán trong khoảng thời gian này.</p>
          )}
          <p className="text-xs text-text-secondary">Không tính hóa đơn đã hủy và món đã hủy; doanh thu đã trừ hoàn tiền một phần (BR-040, 041).</p>
        </Panel>
      </div>

      {picking && (
        <Modal title="Chọn khoảng thời gian" onClose={() => setPicking(false)}>
          <div className="flex gap-3">
            <DateField label="Từ ngày" value={from} onChange={setFrom} />
            <DateField label="Đến ngày" value={to} onChange={setTo} />
          </div>
          <div className="flex gap-2 [&>*]:flex-1">
            <Button variant="secondary" onClick={() => setPicking(false)}>
              Hủy
            </Button>
            <Button onClick={applyCustom}>Xem báo cáo</Button>
          </div>
        </Modal>
      )}
    </OwnerLayout>
  )
}

function Kpi({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border-default bg-bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-bg-subtle">
          <img src={icon} alt="" className="size-[18px]" />
        </span>
        <span className="text-xs font-semibold text-text-secondary">{label}</span>
      </div>
      <p className="text-2xl leading-8 font-bold">{value}</p>
    </div>
  )
}
