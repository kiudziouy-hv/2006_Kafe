import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { QueryState } from '@/components/feedback/QueryState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { CheckField, NumberField, TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useAction } from '@/hooks/useAction'
import { formatMoney } from '@/utils/format'
import { menuApi, STATUS_LABEL, type AdminTopping, type CatalogStatus } from '../api/menuApi'

const KEY = [
  ['admin', 'toppings'],
  ['admin', 'items'],
]
const TONE = { SELLING: 'success', OUT_OF_STOCK: 'warning', STOPPED: 'neutral' } as const

/** UC-06: quản lý topping, phụ phí và các món được phép dùng. */
export function ToppingsTab() {
  const toppings = useQuery({ queryKey: ['admin', 'toppings'], queryFn: menuApi.toppings })
  const [editing, setEditing] = useState<AdminTopping | 'new' | null>(null)
  const status = useAction(
    (v: { id: number; status: CatalogStatus }) => menuApi.toppingStatus(v.id, v.status),
    {
      invalidate: KEY,
      success: 'Đã cập nhật trạng thái topping',
    },
  )

  return (
    <QueryState
      isPending={toppings.isPending}
      error={toppings.error}
      onRetry={() => void toppings.refetch()}
    >
      <div className="mb-3 flex justify-end">
        <Button onClick={() => setEditing('new')}>Thêm topping</Button>
      </div>
      <DataTable
        rows={toppings.data ?? []}
        rowKey={(t) => t.id}
        columns={[
          { header: 'Topping', cell: (t) => <span className="font-semibold">{t.name}</span> },
          { header: 'Phụ phí', cell: (t) => formatMoney(t.surcharge) },
          { header: 'Số món dùng được', cell: (t) => t.itemIds.length },
          {
            header: 'Trạng thái',
            cell: (t) => (
              <div className="flex items-center gap-2">
                <Badge tone={TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                <select
                  aria-label={`Trạng thái của ${t.name}`}
                  value={t.status}
                  onChange={(e) =>
                    status.mutate({ id: t.id, status: e.target.value as CatalogStatus })
                  }
                  className="rounded-lg border border-line bg-white/70 px-2 py-1"
                >
                  {(Object.keys(STATUS_LABEL) as CatalogStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
            ),
          },
          {
            header: '',
            cell: (t) => (
              <Button variant="secondary" onClick={() => setEditing(t)}>
                Sửa
              </Button>
            ),
          },
        ]}
      />
      {editing && (
        <ToppingForm
          topping={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </QueryState>
  )
}

function ToppingForm({ topping, onClose }: { topping: AdminTopping | null; onClose: () => void }) {
  const items = useQuery({ queryKey: ['admin', 'items'], queryFn: menuApi.items })
  const [name, setName] = useState(topping?.name ?? '')
  const [surcharge, setSurcharge] = useState(String(topping?.surcharge ?? ''))
  const [ids, setIds] = useState<number[]>(topping?.itemIds ?? [])
  const save = useAction(
    () => {
      const body = { name, surcharge: Number(surcharge || 0), itemIds: ids }
      return topping ? menuApi.updateTopping(topping.id, body) : menuApi.createTopping(body)
    },
    { invalidate: KEY, success: topping ? 'Đã lưu topping' : 'Đã thêm topping', onDone: onClose },
  )
  const usable = (items.data ?? []).filter((i) => i.group !== 'CAKE')

  return (
    <Modal title={topping ? `Sửa topping: ${topping.name}` : 'Thêm topping'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <TextField label="Tên topping" value={name} onChange={(e) => setName(e.target.value)} />
        <NumberField label="Phụ phí (đồng)" value={surcharge} onValueChange={setSurcharge} />
        <fieldset>
          <legend className="mb-1 text-sm font-semibold">Món được phép dùng</legend>
          <div className="grid max-h-64 grid-cols-1 gap-x-3 overflow-y-auto sm:grid-cols-2">
            {usable.map((i) => (
              <CheckField
                key={i.id}
                label={i.name}
                checked={ids.includes(i.id)}
                onChange={(e) =>
                  setIds((cur) =>
                    e.target.checked ? [...cur, i.id] : cur.filter((x) => x !== i.id),
                  )
                }
              />
            ))}
          </div>
        </fieldset>
        <Button loading={save.isPending} onClick={() => save.mutate(undefined)}>
          Lưu
        </Button>
      </div>
    </Modal>
  )
}
