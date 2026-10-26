import clsx from 'clsx'
import {
  Banknote,
  BarChart3,
  Coffee,
  QrCode,
  Receipt,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { QueryState } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageTitle } from '@/components/ui/PageTitle'
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

const dateInput =
  'h-10 rounded-xl border border-line bg-white px-3 text-sm outline-none transition focus:border-brass'

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
      <Card className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 !py-3">
        <div
          role="group"
          aria-label="Khoảng nhanh"
          className="inline-flex max-w-full overflow-x-auto rounded-full border border-line bg-white p-1"
        >
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={preset === p.id}
              onClick={() => {
                setPreset(p.id)
                setRange(range(p.id))
              }}
              className={clsx(
                'min-h-8 shrink-0 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition',
                preset === p.id
                  ? 'bg-gradient-to-r from-[#825423] to-[#693714] text-ivory'
                  : 'text-ink-soft hover:text-ink',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            aria-label="Từ ngày"
            className={dateInput}
            value={custom[0]}
            onChange={(e) => setCustom([e.target.value, custom[1]])}
          />
          <span className="text-ink-soft" aria-hidden>
            –
          </span>
          <input
            type="date"
            aria-label="Đến ngày"
            className={dateInput}
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
  icon: Icon,
  label,
  value,
  note,
  selected,
  onSelect,
}: {
  icon: LucideIcon
  label: string
  value: string
  note?: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={clsx(
        'vt-card group flex w-full items-start justify-between gap-3 p-4 text-left transition duration-200 sm:p-5',
        'hover:-translate-y-0.5 focus-visible:-translate-y-0.5',
        selected
          ? '!border-transparent !bg-gradient-to-br from-coffee-900 to-coffee-700 !text-ivory hover:brightness-110'
          : 'hover:!border-brass hover:!bg-[#f3e4c3] hover:shadow-[var(--shadow-lift)]',
      )}
    >
      <div className="min-w-0">
        <p
          className={clsx(
            'text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors',
            selected ? 'text-coffee-200' : 'text-ink-soft group-hover:text-coffee-700',
          )}
        >
          {label}
        </p>
        <p className="font-display mt-2 truncate text-[1.7rem] leading-none">{value}</p>
        {note && (
          <p className={clsx('mt-1.5 text-xs', selected ? 'text-coffee-200' : 'text-ink-soft')}>
            {note}
          </p>
        )}
      </div>
      <span
        className={clsx(
          'grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors duration-200',
          selected
            ? 'bg-white/15 text-brass-light'
            : 'bg-coffee-100 text-coffee-700 group-hover:bg-coffee-700 group-hover:text-ivory',
        )}
        aria-hidden
      >
        <Icon size={19} strokeWidth={1.8} />
      </span>
    </button>
  )
}

function Panel({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </Card>
  )
}

type Metric = 'revenue' | 'invoices' | 'items' | 'average'

const METRIC_TITLE: Record<Metric, string> = {
  revenue: 'Doanh thu theo ngày',
  invoices: 'Số hóa đơn theo ngày',
  items: 'Sản phẩm đã bán theo ngày',
  average: 'Trung bình mỗi hóa đơn theo ngày',
}

/** Giá trị của một ngày theo chỉ số đang chọn (trung bình = doanh thu / số hóa đơn, 0 nếu không có hóa đơn). */
function metricOf(d: RevenueSummary['daily'][number], m: Metric): number {
  switch (m) {
    case 'revenue':
      return d.revenue
    case 'invoices':
      return d.invoices
    case 'items':
      return d.items
    case 'average':
      return d.invoices === 0 ? 0 : Math.floor(d.revenue / d.invoices)
  }
}

function Report({ data }: { data: RevenueSummary }) {
  const [metric, setMetric] = useState<Metric>('revenue')
  const paid = data.cashRevenue + data.transferRevenue
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={Banknote}
          label="Tổng doanh thu"
          value={formatMoney(data.revenue)}
          note={data.refunded > 0 ? `Đã trừ hoàn tiền ${formatMoney(data.refunded)}` : undefined}
          selected={metric === 'revenue'}
          onSelect={() => setMetric('revenue')}
        />
        <Kpi
          icon={Receipt}
          label="Số hóa đơn"
          value={String(data.invoices)}
          selected={metric === 'invoices'}
          onSelect={() => setMetric('invoices')}
        />
        <Kpi
          icon={Coffee}
          label="Sản phẩm đã bán"
          value={String(data.itemsSold)}
          selected={metric === 'items'}
          onSelect={() => setMetric('items')}
        />
        <Kpi
          icon={TrendingUp}
          label="Trung bình / hóa đơn"
          value={formatMoney(data.average)}
          selected={metric === 'average'}
          onSelect={() => setMetric('average')}
        />
      </div>

      <div className="grid items-stretch gap-5 xl:grid-cols-[2fr_1fr]">
        <Panel title={METRIC_TITLE[metric]}>
          {data.daily.every((d) => metricOf(d, metric) === 0) ? (
            <EmptyState icon={BarChart3}>Chưa có hóa đơn trong khoảng này.</EmptyState>
          ) : (
            <BarChart data={data.daily} metric={metric} />
          )}
        </Panel>
        <Panel title="Phương thức thanh toán">
          <div className="flex flex-col gap-5">
            <PaymentRow icon={Banknote} label="Tiền mặt" value={data.cashRevenue} total={paid} />
            <PaymentRow
              icon={QrCode}
              label="Chuyển khoản / QR"
              value={data.transferRevenue}
              total={paid}
            />
          </div>
        </Panel>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[3fr_2fr]">
        <Panel title="Món bán chạy">
          {data.bestSellers.length === 0 ? (
            <EmptyState icon={Coffee}>Chưa có món nào được bán.</EmptyState>
          ) : (
            <ol className="flex flex-col gap-4">
              {data.bestSellers.map((b, i) => (
                <li key={b.name}>
                  <div className="flex items-baseline gap-3">
                    <span className="w-5 text-sm font-semibold text-ink-soft tabular">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{b.name}</span>
                    <span className="text-sm text-ink-soft tabular">×{b.quantity}</span>
                    <span className="w-28 text-right font-semibold tabular">
                      {formatMoney(Number(b.revenue))}
                    </span>
                  </div>
                  <Meter
                    className="ml-8 mt-1.5"
                    ratio={b.quantity / (data.bestSellers[0]?.quantity || 1)}
                  />
                </li>
              ))}
            </ol>
          )}
        </Panel>
        <Panel title="Theo nhóm món">
          {data.byGroup.length === 0 ? (
            <EmptyState icon={Coffee}>Chưa có dữ liệu.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-4">
              {data.byGroup.map((g) => {
                const total = data.byGroup.reduce((s, x) => s + x.quantity, 0) || 1
                return (
                  <li key={g.group}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">{GROUP_LABEL[g.group] ?? g.group}</span>
                      <span className="text-sm text-ink-soft tabular">
                        {g.quantity} · {Math.round((g.quantity / total) * 100)}%
                      </span>
                    </div>
                    <Meter className="mt-1.5" ratio={g.quantity / total} />
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

/** Thanh tỷ lệ mảnh dùng cho danh sách xếp hạng. */
function Meter({ ratio, className }: { ratio: number; className?: string }) {
  return (
    <div className={clsx('h-1.5 overflow-hidden rounded-full bg-coffee-100', className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-brass to-coffee-600"
        style={{ width: `${Math.max(2, Math.min(100, ratio * 100))}%` }}
      />
    </div>
  )
}

function PaymentRow({
  icon: Icon,
  label,
  value,
  total,
}: {
  icon: LucideIcon
  label: string
  value: number
  total: number
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span
          className="grid h-9 w-9 place-items-center rounded-full bg-coffee-100 text-coffee-700"
          aria-hidden
        >
          <Icon size={17} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-soft">{label}</p>
          <p className="font-display text-xl leading-tight">{formatMoney(value)}</p>
        </div>
        <span className="text-sm font-semibold text-ink-soft tabular">
          {total > 0 ? `${Math.round((value / total) * 100)}%` : '0%'}
        </span>
      </div>
      <Meter className="mt-2.5" ratio={total > 0 ? value / total : 0} />
    </div>
  )
}

/** Giá trị trục dạng ngắn: 161k, 1,2tr. */
function compact(v: number): string {
  if (v >= 1_000_000)
    return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1).replace('.', ',')}tr`
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`
  return String(v)
}

/** Làm tròn trần trục lên mức 1 / 2 / 5 x 10^n để các vạch chia đẹp. */
function niceMax(v: number): number {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  const n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p
}

/** Biểu đồ cột bằng HTML/CSS: vạch chia và nhãn trục, nhãn giá trị trên cột khi ít ngày; cột cao nhất tô đậm. */
function BarChart({ data, metric }: { data: RevenueSummary['daily']; metric: Metric }) {
  const money = metric === 'revenue' || metric === 'average'
  const values = data.map((d) => metricOf(d, metric))
  const max = Math.max(...values)
  // Số tiền: trần theo mức 1/2/5; số đếm: bội của 4 để mọi vạch chia là số nguyên
  const top = money ? niceMax(max) : Math.max(4, Math.ceil(max / 4) * 4)
  const label = (v: number) => (money ? compact(v) : String(v))
  const ticks = [1, 0.75, 0.5, 0.25, 0]
  const showValues = data.length <= 10
  const step = Math.ceil(data.length / 10)
  return (
    <figure aria-label={METRIC_TITLE[metric]}>
      <div className="flex gap-3">
        <div className="flex h-56 flex-col justify-between text-right text-[11px] leading-none text-ink-soft tabular">
          {ticks.map((t) => (
            <span key={t}>{label(top * t)}</span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-56">
            <div className="absolute inset-0 flex flex-col justify-between" aria-hidden>
              {ticks.map((t) => (
                <div
                  key={t}
                  className={clsx(
                    'border-t',
                    t === 0 ? 'border-line' : 'border-dashed border-line/80',
                  )}
                />
              ))}
            </div>
            <div className="relative flex h-full items-end gap-1.5 px-1 sm:gap-3">
              {data.map((d, i) => (
                <div
                  key={d.date}
                  title={`${formatDate(d.date)}: ${money ? formatMoney(values[i]!) : values[i]}`}
                  className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                >
                  {showValues && values[i]! > 0 && (
                    <span className="mb-1 text-[11px] font-semibold text-ink-soft tabular">
                      {label(values[i]!)}
                    </span>
                  )}
                  <div
                    className={clsx(
                      'w-full max-w-12 rounded-t-lg transition-[height]',
                      values[i] === max
                        ? 'bg-gradient-to-t from-coffee-700 to-brass'
                        : 'bg-coffee-200/80',
                    )}
                    style={{
                      height: `${Math.max((values[i]! / top) * 100, values[i]! > 0 ? 1.5 : 0)}%`,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 flex gap-1.5 px-1 sm:gap-3">
            {data.map((d, i) => (
              <span
                key={d.date}
                className="min-w-0 flex-1 text-center text-[11px] text-ink-soft tabular"
              >
                {i % step === 0 ? `${d.date.slice(8)}/${d.date.slice(5, 7)}` : ''}
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  )
}
