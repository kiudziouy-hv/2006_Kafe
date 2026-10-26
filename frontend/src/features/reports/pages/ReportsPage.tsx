import { BarChart3 } from 'lucide-react'
import { PageTitle } from '@/components/ui/PageTitle'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { QueryState } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { TextField } from '@/components/ui/Field'
import { formatDate, formatMoney, GROUP_LABEL, todayIso } from '@/utils/format'
import { reportsApi, type RevenueSummary } from '../api/reportsApi'

type Preset = 'today' | 'yesterday' | 'week' | 'month' | 'custom'

function range(p: Exclude<Preset, 'custom'>): [string, string] {
  switch (p) {
    case 'today':
      return [todayIso(), todayIso()]
    case 'yesterday':
      return [todayIso(-1), todayIso(-1)]
    case 'week':
      return [todayIso(-6), todayIso()]
    case 'month':
      return [`${todayIso().slice(0, 8)}01`, todayIso()]
  }
}

const PRESETS: { id: Exclude<Preset, 'custom'>; label: string }[] = [
  { id: 'today', label: 'Hôm nay' },
  { id: 'yesterday', label: 'Hôm qua' },
  { id: 'week', label: '7 ngày qua' },
  { id: 'month', label: 'Tháng này' },
]

/** UC-33: doanh thu, số hóa đơn, số sản phẩm đã bán, món bán chạy theo khoảng thời gian (BR-040, BR-041). */
export default function ReportsPage() {
  const [preset, setPreset] = useState<Preset>('today')
  const [[from, to], setRange] = useState<[string, string]>(range('today'))
  const [custom, setCustom] = useState<[string, string]>(range('week'))
  const report = useQuery({
    queryKey: ['reports', from, to],
    queryFn: () => reportsApi.summary(from, to),
  })
  const invalid = custom[0] > custom[1]

  return (
    <section aria-label="Báo cáo doanh thu">
      <PageTitle icon={BarChart3}>Báo cáo doanh thu</PageTitle>
      <Card className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div role="group" aria-label="Khoảng nhanh" className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.id}
              variant={preset === p.id ? 'primary' : 'secondary'}
              onClick={() => {
                setPreset(p.id)
                setRange(range(p.id))
              }}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <TextField
            label="Từ ngày"
            type="date"
            value={custom[0]}
            onChange={(e) => setCustom([e.target.value, custom[1]])}
          />
          <TextField
            label="Đến ngày"
            type="date"
            value={custom[1]}
            onChange={(e) => setCustom([custom[0], e.target.value])}
          />
          <Button
            variant={preset === 'custom' ? 'primary' : 'secondary'}
            disabled={invalid}
            onClick={() => {
              setPreset('custom')
              setRange(custom)
            }}
          >
            Xem
          </Button>
        </div>
      </Card>
      {invalid && (
        <p role="alert" className="mb-3 text-danger">
          Khoảng thời gian không hợp lệ: ngày bắt đầu sau ngày kết thúc.
        </p>
      )}
      <QueryState
        isPending={report.isPending}
        error={report.error}
        onRetry={() => void report.refetch()}
      >
        {report.data && <Report data={report.data} />}
      </QueryState>
    </section>
  )
}

function Kpi({
  label,
  value,
  note,
  featured,
}: {
  label: string
  value: string
  note?: string
  featured?: boolean
}) {
  return (
    <Card
      className={
        featured ? 'bg-gradient-to-br from-coffee-900 to-coffee-700 !text-brass-light' : undefined
      }
    >
      <p className={featured ? 'text-sm text-coffee-200' : 'text-sm text-ink-soft'}>{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {note && (
        <p className={featured ? 'mt-1 text-xs text-coffee-200' : 'mt-1 text-xs text-ink-soft'}>
          {note}
        </p>
      )}
    </Card>
  )
}

function Report({ data }: { data: RevenueSummary }) {
  return (
    <div className="flex flex-col gap-5">
      {data.empty && (
        <p role="status" className="rounded-2xl bg-warning-bg px-4 py-2 text-warning">
          Không có hóa đơn nào trong khoảng {formatDate(data.from)} – {formatDate(data.to)}.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi
          featured
          label="Tổng doanh thu"
          value={formatMoney(data.revenue)}
          note={data.refunded > 0 ? `Đã trừ hoàn tiền ${formatMoney(data.refunded)}` : undefined}
        />
        <Kpi label="Số hóa đơn" value={String(data.invoices)} />
        <Kpi label="Sản phẩm đã bán" value={String(data.itemsSold)} />
        <Kpi label="Trung bình / hóa đơn" value={formatMoney(data.average)} />
        <Kpi label="Tiền mặt" value={formatMoney(data.cashRevenue)} />
        <Kpi label="Chuyển khoản / QR" value={formatMoney(data.transferRevenue)} />
      </div>
      <Card>
        <h2 className="mb-3 text-lg font-bold">Doanh thu theo ngày</h2>
        <BarChart data={data.daily} />
      </Card>
      <div className="grid items-start gap-5 lg:grid-cols-[3fr_2fr]">
        <div>
          <h2 className="mb-3 text-lg font-bold">Món bán chạy</h2>
          <DataTable
            rows={data.bestSellers}
            rowKey={(b) => b.name}
            empty="Chưa có món nào được bán."
            columns={[
              { header: 'Món', cell: (b) => b.name },
              { header: 'Số lượng', cell: (b) => b.quantity },
              { header: 'Doanh thu', cell: (b) => formatMoney(Number(b.revenue)) },
            ]}
          />
        </div>
        <div>
          <h2 className="mb-3 text-lg font-bold">Theo nhóm món</h2>
          <DataTable
            rows={data.byGroup}
            rowKey={(g) => g.group}
            empty="Chưa có dữ liệu."
            columns={[
              { header: 'Nhóm', cell: (g) => GROUP_LABEL[g.group] ?? g.group },
              { header: 'Số lượng', cell: (g) => g.quantity },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

/** Biểu đồ cột SVG: không cần thư viện; nhãn ngày thưa dần khi khoảng dài. */
function BarChart({ data }: { data: RevenueSummary['daily'] }) {
  const max = Math.max(1, ...data.map((d) => d.revenue))
  const w = 100 / Math.max(1, data.length)
  const barW = Math.min(w * 0.7, 9)
  const step = Math.ceil(data.length / 8)
  return (
    <figure>
      <svg
        viewBox="0 0 100 48"
        className="h-64 w-full"
        role="img"
        aria-label="Biểu đồ doanh thu theo ngày"
      >
        <defs>
          <linearGradient id="vt-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-brass)" />
            <stop offset="1" stopColor="var(--color-coffee-700)" />
          </linearGradient>
        </defs>
        <line x1="0" y1="40" x2="100" y2="40" stroke="var(--color-line)" strokeWidth="0.3" />
        {data.map((d, i) => {
          const h = (d.revenue / max) * 36
          return (
            <g key={d.date}>
              <title>{`${formatDate(d.date)}: ${formatMoney(d.revenue)} (${d.invoices} hóa đơn)`}</title>
              <rect
                x={i * w + (w - barW) / 2}
                y={40 - h}
                width={barW}
                height={Math.max(h, 0.3)}
                rx="0.8"
                fill="url(#vt-bar)"
              />
              {i % step === 0 && (
                <text
                  x={i * w + w / 2}
                  y="46"
                  textAnchor="middle"
                  fontSize="2.6"
                  fill="var(--color-ink-soft)"
                >
                  {d.date.slice(8)}/{d.date.slice(5, 7)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <figcaption className="mt-1 text-right text-xs text-ink-soft">
        Cao nhất: {formatMoney(max)}
      </figcaption>
    </figure>
  )
}
