import { TabAction } from '@/components/ui/Tabs'
import { useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
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
import { ImageTile } from './ImageTile'
import { useMenuView, ViewToggle } from './ViewToggle'

const KEY = [
  ['admin', 'toppings'],
  ['admin', 'items'],
]
const TONE = { SELLING: 'success', OUT_OF_STOCK: 'warning', STOPPED: 'neutral' } as const

/** UC-06: quản lý topping, phụ phí và các món được phép dùng. */
export function ToppingsTab() {
  const toppings = useQuery({ queryKey: ['admin', 'toppings'], queryFn: menuApi.toppings })
  const [editing, setEditing] = useState<AdminTopping | 'new' | null>(null)
  const [view, chooseView] = useMenuView()
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
      <TabAction>
        <Button onClick={() => setEditing('new')}>Thêm topping</Button>
      </TabAction>
      <div className="mb-4">
        <ViewToggle value={view} onChange={chooseView} />
      </div>
      {view === 'gallery' ? (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(toppings.data ?? []).map((t) => (
            <ToppingTile key={t.id} topping={t} onEdit={() => setEditing(t)} />
          ))}
        </ul>
      ) : (
        <DataTable
          rows={toppings.data ?? []}
          rowKey={(t) => t.id}
          columns={[
            {
              header: '',
              cell: (t) =>
                t.imageUrl ? (
                  <img src={t.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-coffee-100 text-coffee-700">
                    <Sparkles size={18} aria-hidden />
                  </span>
                ),
            },
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
      )}
      {editing && (
        <ToppingForm
          topping={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </QueryState>
  )
}

function ToppingTile({ topping, onEdit }: { topping: AdminTopping; onEdit: () => void }) {
  const upload = useAction((f: File) => menuApi.uploadToppingImage(topping.id, f), {
    invalidate: KEY,
    success: 'Đã cập nhật ảnh topping',
  })
  return (
    <ImageTile
      name={topping.name}
      eyebrow="Topping"
      subtitle={`+${formatMoney(topping.surcharge)}`}
      imageUrl={topping.imageUrl}
      badge={<Badge tone={TONE[topping.status]}>{STATUS_LABEL[topping.status]}</Badge>}
      icon={Sparkles}
      tint="from-[#efe5ce] to-[#e2d3b0]"
      uploading={upload.isPending}
      onUpload={(f) => upload.mutate(f)}
      onEdit={onEdit}
    />
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
