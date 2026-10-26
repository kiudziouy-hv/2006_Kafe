import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { QueryState } from '@/components/feedback/QueryState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { NumberField, SelectField, TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useAction } from '@/hooks/useAction'
import { formatDate, GROUP_LABEL } from '@/utils/format'
import { menuApi, type ItemGroup, type Promotion } from '../api/menuApi'

const KEY = [['admin', 'promotions']]

/** UC-27: chương trình khuyến mãi theo phần trăm cho một nhóm món, theo khoảng ngày và khung giờ mỗi ngày. */
export function PromotionsTab() {
  const promos = useQuery({ queryKey: ['admin', 'promotions'], queryFn: menuApi.promotions })
  const [editing, setEditing] = useState<Promotion | 'new' | null>(null)
  const toggle = useAction((p: Promotion) => menuApi.setPromotionActive(p.id, !p.active), {
    invalidate: KEY,
    success: (p) => (p.active ? 'Đã kích hoạt chương trình' : 'Đã ngừng chương trình'),
  })

  return (
    <QueryState
      isPending={promos.isPending}
      error={promos.error}
      onRetry={() => void promos.refetch()}
    >
      <div className="mb-3 flex items-center justify-end gap-3">
        <Button onClick={() => setEditing('new')}>Tạo chương trình</Button>
      </div>
      <DataTable
        rows={promos.data ?? []}
        rowKey={(p) => p.id}
        columns={[
          { header: 'Chương trình', cell: (p) => <span className="font-semibold">{p.name}</span> },
          { header: 'Nhóm món', cell: (p) => GROUP_LABEL[p.group] },
          { header: 'Giảm', cell: (p) => `${p.discountPercent}%` },
          {
            header: 'Ngày áp dụng',
            cell: (p) =>
              p.startDate || p.endDate
                ? `${formatDate(p.startDate)} – ${formatDate(p.endDate)}`
                : 'Mọi ngày',
          },
          { header: 'Khung giờ', cell: (p) => `${p.dailyStart} – ${p.dailyEnd}` },
          {
            header: 'Trạng thái',
            cell: (p) => (
              <Badge tone={p.active ? 'success' : 'neutral'}>
                {p.active ? 'Đang chạy' : 'Đã ngừng'}
              </Badge>
            ),
          },
          {
            header: '',
            cell: (p) => (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setEditing(p)}>
                  Sửa
                </Button>
                <Button variant="ghost" loading={toggle.isPending} onClick={() => toggle.mutate(p)}>
                  {p.active ? 'Ngừng' : 'Kích hoạt'}
                </Button>
              </div>
            ),
          },
        ]}
      />
      {editing && (
        <PromotionForm
          promo={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </QueryState>
  )
}

function PromotionForm({ promo, onClose }: { promo: Promotion | null; onClose: () => void }) {
  const [name, setName] = useState(promo?.name ?? '')
  const [group, setGroup] = useState<ItemGroup>(promo?.group ?? 'TEA')
  const [percent, setPercent] = useState(String(promo?.discountPercent ?? ''))
  const [start, setStart] = useState(promo?.startDate ?? '')
  const [end, setEnd] = useState(promo?.endDate ?? '')
  const [from, setFrom] = useState(promo?.dailyStart ?? '14:00')
  const [to, setTo] = useState(promo?.dailyEnd ?? '16:00')
  const save = useAction(
    () => {
      const body = {
        name,
        group,
        discountPercent: Number(percent || 0),
        startDate: start || null,
        endDate: end || null,
        dailyStart: from,
        dailyEnd: to,
      }
      return promo ? menuApi.updatePromotion(promo.id, body) : menuApi.createPromotion(body)
    },
    {
      invalidate: KEY,
      success: promo ? 'Đã lưu chương trình' : 'Đã tạo chương trình',
      onDone: onClose,
    },
  )

  return (
    <Modal title={promo ? 'Sửa chương trình' : 'Tạo chương trình khuyến mãi'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <TextField
          label="Tên chương trình"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <SelectField
          label="Nhóm món áp dụng"
          value={group}
          onChange={(e) => setGroup(e.target.value as ItemGroup)}
        >
          {Object.entries(GROUP_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </SelectField>
        <NumberField
          label="Mức giảm (%)"
          hint="Từ 1 đến 50"
          value={percent}
          onValueChange={setPercent}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Từ ngày (tùy chọn)"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <TextField
            label="Đến ngày (tùy chọn)"
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
          <TextField
            label="Giờ bắt đầu mỗi ngày"
            type="time"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <TextField
            label="Giờ kết thúc mỗi ngày"
            type="time"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <Button loading={save.isPending} onClick={() => save.mutate(undefined)}>
          Lưu và kích hoạt
        </Button>
      </div>
    </Modal>
  )
}
