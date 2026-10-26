import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { QueryState } from '@/components/feedback/QueryState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { CheckField, NumberField, TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useAction } from '@/hooks/useAction'
import { inventoryApi, num, type Ingredient } from '../api/inventoryApi'

const KEY = [['inventory']]

/** UC-16: danh mục nguyên liệu, đơn vị, mức tồn tối thiểu và theo dõi hạn dùng (chỉ sữa tươi và bánh, BR-017). */
export function IngredientsTab() {
  const list = useQuery({
    queryKey: ['inventory', 'ingredients'],
    queryFn: inventoryApi.ingredients,
  })
  const [editing, setEditing] = useState<Ingredient | 'new' | null>(null)
  return (
    <QueryState isPending={list.isPending} error={list.error} onRetry={() => void list.refetch()}>
      <div className="mb-3 flex justify-end">
        <Button onClick={() => setEditing('new')}>Thêm nguyên liệu</Button>
      </div>
      <DataTable
        rows={list.data ?? []}
        rowKey={(i) => i.id}
        columns={[
          { header: 'Nguyên liệu', cell: (i) => <span className="font-semibold">{i.name}</span> },
          { header: 'Đơn vị', cell: (i) => i.unit },
          { header: 'Tồn hiện tại', cell: (i) => num(i.currentStock) },
          { header: 'Khả dụng', cell: (i) => num(i.availableStock) },
          { header: 'Tối thiểu', cell: (i) => num(i.minStock) },
          { header: 'Hạn dùng', cell: (i) => (i.trackExpiry ? 'Có theo dõi' : '—') },
          { header: '', cell: (i) => (i.low ? <Badge tone="danger">Tồn thấp</Badge> : null) },
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
      {editing && (
        <IngredientForm
          item={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </QueryState>
  )
}

function IngredientForm({ item, onClose }: { item: Ingredient | null; onClose: () => void }) {
  const [name, setName] = useState(item?.name ?? '')
  const [unit, setUnit] = useState(item?.unit ?? '')
  const [min, setMin] = useState(String(item?.minStock ?? 0))
  const [track, setTrack] = useState(item?.trackExpiry ?? false)
  const save = useAction(
    () => {
      const body = { name, unit, minStock: Number(min || 0), trackExpiry: track }
      return item
        ? inventoryApi.updateIngredient(item.id, body)
        : inventoryApi.createIngredient(body)
    },
    {
      invalidate: KEY,
      success: item ? 'Đã lưu nguyên liệu' : 'Đã thêm nguyên liệu',
      onDone: onClose,
    },
  )
  return (
    <Modal title={item ? `Sửa: ${item.name}` : 'Thêm nguyên liệu'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <TextField label="Tên nguyên liệu" value={name} onChange={(e) => setName(e.target.value)} />
        <TextField
          label="Đơn vị tính"
          placeholder="g, ml, cái…"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />
        <NumberField label="Mức tồn tối thiểu" value={min} onValueChange={setMin} />
        <CheckField
          label="Theo dõi hạn sử dụng (sữa tươi, bánh)"
          checked={track}
          onChange={(e) => setTrack(e.target.checked)}
        />
        <Button loading={save.isPending} onClick={() => save.mutate(undefined)}>
          Lưu
        </Button>
      </div>
    </Modal>
  )
}
