import { useQuery } from '@tanstack/react-query'
import { LayoutGrid, List } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import { QueryState } from '@/components/feedback/QueryState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { CheckField, NumberField, SelectField, TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useAction } from '@/hooks/useAction'
import { ItemGallery } from './ItemGallery'
import { formatMoney, GROUP_LABEL } from '@/utils/format'
import {
  menuApi,
  STATUS_LABEL,
  type AdminItem,
  type CatalogStatus,
  type ItemGroup,
} from '../api/menuApi'

const KEY = [['admin', 'items']]
const STATUSES = Object.keys(STATUS_LABEL) as CatalogStatus[]
const TONE = { SELLING: 'success', OUT_OF_STOCK: 'warning', STOPPED: 'neutral' } as const

/** UC-05: quản lý món. Món đã phát sinh giao dịch không xóa mà chuyển Ngừng bán (BR-007). */
export function ItemsTab() {
  const items = useQuery({ queryKey: ['admin', 'items'], queryFn: menuApi.items })
  const toppings = useQuery({ queryKey: ['admin', 'toppings'], queryFn: menuApi.toppings })
  const [editing, setEditing] = useState<AdminItem | 'new' | null>(null)
  const [view, setView] = useState<'gallery' | 'list'>(() => {
    try {
      return localStorage.getItem('vt-menu-view') === 'list' ? 'list' : 'gallery'
    } catch {
      return 'gallery'
    }
  })
  const chooseView = (v: 'gallery' | 'list') => {
    setView(v)
    try {
      localStorage.setItem('vt-menu-view', v)
    } catch {
      /* không lưu được thì bỏ qua */
    }
  }
  const itemStatus = useAction(
    (v: { id: number; status: CatalogStatus }) => menuApi.itemStatus(v.id, v.status),
    {
      invalidate: KEY,
      success: 'Đã cập nhật trạng thái món',
    },
  )
  const sizeStatus = useAction(
    (v: { id: number; size: string; status: CatalogStatus }) =>
      menuApi.sizeStatus(v.id, v.size, v.status),
    { invalidate: KEY, success: 'Đã cập nhật trạng thái kích thước' },
  )

  return (
    <QueryState
      isPending={items.isPending}
      error={items.error}
      onRetry={() => void items.refetch()}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Kiểu hiển thị"
          className="inline-flex rounded-full border border-brass/50 bg-white/60 p-1"
        >
          {(
            [
              ['gallery', 'Ảnh', LayoutGrid],
              ['list', 'Danh sách', List],
            ] as const
          ).map(([v, label, Icon]) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => chooseView(v)}
              className={clsx(
                'flex min-h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold transition',
                view === v
                  ? 'bg-gradient-to-r from-coffee-900 to-coffee-700 text-ivory'
                  : 'text-ink hover:bg-coffee-100',
              )}
            >
              <Icon size={16} aria-hidden />
              {label}
            </button>
          ))}
        </div>
        <Button onClick={() => setEditing('new')}>Thêm món</Button>
      </div>
      {view === 'gallery' ? (
        <ItemGallery items={items.data ?? []} onEdit={setEditing} />
      ) : (
        <DataTable
          rows={items.data ?? []}
          rowKey={(i) => i.id}
          columns={[
            { header: 'Món', cell: (i) => <span className="font-semibold">{i.name}</span> },
            { header: 'Nhóm', cell: (i) => GROUP_LABEL[i.group] },
            {
              header: 'Kích thước & giá',
              cell: (i) => (
                <div className="flex flex-col gap-1">
                  {i.sizes.map((s) => (
                    <div key={s.size} className="flex items-center gap-2">
                      <span className="w-24">
                        {s.size}: {formatMoney(s.price)}
                      </span>
                      <select
                        aria-label={`Trạng thái cỡ ${s.size} của ${i.name}`}
                        value={s.status}
                        onChange={(e) =>
                          sizeStatus.mutate({
                            id: i.id,
                            size: s.size,
                            status: e.target.value as CatalogStatus,
                          })
                        }
                        className="rounded-lg border border-line bg-white/70 px-2 py-1"
                      >
                        {STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {STATUS_LABEL[st]}
                          </option>
                        ))}
                      </select>
                      {s.status === 'OUT_OF_STOCK' && (
                        <span className="text-xs text-ink-soft">
                          {s.statusSource === 'SYSTEM' ? 'do hệ thống' : 'do Quản lý'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ),
            },
            {
              header: 'Phục vụ',
              cell: (i) =>
                i.group === 'CAKE'
                  ? 'Tại quán / mang đi'
                  : [i.allowHot && 'Nóng', i.allowCold && 'Lạnh'].filter(Boolean).join(' · '),
            },
            {
              header: 'Trạng thái món',
              cell: (i) => (
                <div className="flex items-center gap-2">
                  <Badge tone={TONE[i.status]}>{STATUS_LABEL[i.status]}</Badge>
                  <select
                    aria-label={`Trạng thái của ${i.name}`}
                    value={i.status}
                    onChange={(e) =>
                      itemStatus.mutate({ id: i.id, status: e.target.value as CatalogStatus })
                    }
                    className="rounded-lg border border-line bg-white/70 px-2 py-1"
                  >
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {STATUS_LABEL[st]}
                      </option>
                    ))}
                  </select>
                </div>
              ),
            },
            {
              header: '',
              cell: (i) => (
                <Button variant="secondary" onClick={() => setEditing(i)}>
                  Sửa
                </Button>
              ),
            },
          ]}
        />
      )}
      {editing && (
        <ItemForm
          item={editing === 'new' ? null : editing}
          toppings={(toppings.data ?? []).map((t) => ({ id: t.id, name: t.name }))}
          onClose={() => setEditing(null)}
        />
      )}
    </QueryState>
  )
}

function ItemForm({
  item,
  toppings,
  onClose,
}: {
  item: AdminItem | null
  toppings: { id: number; name: string }[]
  onClose: () => void
}) {
  const price = (size: 'M' | 'L') => item?.sizes.find((s) => s.size === size)?.price
  const [name, setName] = useState(item?.name ?? '')
  const [group, setGroup] = useState<ItemGroup>(item?.group ?? 'COFFEE')
  const [hot, setHot] = useState(item?.allowHot ?? true)
  const [cold, setCold] = useState(item?.allowCold ?? true)
  const [useM, setUseM] = useState(item ? price('M') !== undefined : true)
  const [useL, setUseL] = useState(item ? price('L') !== undefined : true)
  const [pm, setPm] = useState(String(price('M') ?? ''))
  const [pl, setPl] = useState(String(price('L') ?? ''))
  const [tops, setTops] = useState<number[]>(item?.toppingIds ?? [])
  const cake = group === 'CAKE'

  const save = useAction(
    () => {
      const sizes = [
        ...(useM ? [{ size: 'M' as const, price: Number(pm || 0) }] : []),
        ...(useL ? [{ size: 'L' as const, price: Number(pl || 0) }] : []),
      ]
      const body = {
        name,
        group,
        allowHot: cake ? false : hot,
        allowCold: cake ? true : cold,
        sizes,
        toppingIds: cake ? [] : tops,
      }
      return item ? menuApi.updateItem(item.id, body) : menuApi.createItem(body)
    },
    { invalidate: KEY, success: item ? 'Đã lưu món' : 'Đã thêm món', onDone: onClose },
  )

  return (
    <Modal title={item ? `Sửa món: ${item.name}` : 'Thêm món'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <TextField label="Tên món" value={name} onChange={(e) => setName(e.target.value)} />
        <SelectField
          label="Nhóm món"
          value={group}
          onChange={(e) => setGroup(e.target.value as ItemGroup)}
        >
          {Object.entries(GROUP_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </SelectField>
        {!cake && (
          <div className="flex gap-4">
            <CheckField
              label="Có bản nóng (chỉ tại quán)"
              checked={hot}
              onChange={(e) => setHot(e.target.checked)}
            />
            <CheckField
              label="Có bản lạnh"
              checked={cold}
              onChange={(e) => setCold(e.target.checked)}
            />
          </div>
        )}
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="mb-1 text-sm font-semibold">Kích thước và giá bán</legend>
          <div>
            <CheckField label="Cỡ M" checked={useM} onChange={(e) => setUseM(e.target.checked)} />
            {useM && <NumberField label="Giá cỡ M (đồng)" value={pm} onValueChange={setPm} />}
          </div>
          <div>
            <CheckField label="Cỡ L" checked={useL} onChange={(e) => setUseL(e.target.checked)} />
            {useL && <NumberField label="Giá cỡ L (đồng)" value={pl} onValueChange={setPl} />}
          </div>
        </fieldset>
        {!cake && (
          <fieldset>
            <legend className="mb-1 text-sm font-semibold">Topping được phép dùng</legend>
            <div className="grid grid-cols-2 gap-x-3">
              {toppings.map((t) => (
                <CheckField
                  key={t.id}
                  label={t.name}
                  checked={tops.includes(t.id)}
                  onChange={(e) =>
                    setTops((cur) =>
                      e.target.checked ? [...cur, t.id] : cur.filter((x) => x !== t.id),
                    )
                  }
                />
              ))}
            </div>
          </fieldset>
        )}

        <Button loading={save.isPending} onClick={() => save.mutate(undefined)}>
          Lưu
        </Button>
      </div>
    </Modal>
  )
}
