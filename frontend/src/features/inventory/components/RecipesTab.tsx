import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { QueryState } from '@/components/feedback/QueryState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { useAction } from '@/hooks/useAction'
import { inventoryApi, type RecipeLine, type RecipeTarget } from '../api/inventoryApi'

const KEY = [['inventory', 'recipes']]

/** UC-17: thiết lập công thức (định lượng nguyên liệu, kể cả ly, nắp) cho từng kích thước món và từng topping. */
export function RecipesTab() {
  const targets = useQuery({
    queryKey: ['inventory', 'recipes'],
    queryFn: inventoryApi.recipeTargets,
  })
  const [editing, setEditing] = useState<RecipeTarget | null>(null)
  return (
    <QueryState
      isPending={targets.isPending}
      error={targets.error}
      onRetry={() => void targets.refetch()}
    >
      <DataTable
        rows={targets.data ?? []}
        rowKey={(t) => `${t.kind}-${t.itemId}-${t.size}-${t.toppingId}`}
        columns={[
          { header: 'Món / topping', cell: (t) => <span className="font-semibold">{t.name}</span> },
          {
            header: 'Công thức',
            cell: (t) =>
              t.lineCount > 0 ? (
                <Badge tone="success">{t.lineCount} nguyên liệu</Badge>
              ) : (
                <Badge tone="warning">Chưa có</Badge>
              ),
          },
          {
            header: '',
            cell: (t) => (
              <Button variant="secondary" onClick={() => setEditing(t)}>
                {t.lineCount > 0 ? 'Sửa' : 'Thiết lập'}
              </Button>
            ),
          },
        ]}
      />
      {editing && <RecipeEditor target={editing} onClose={() => setEditing(null)} />}
    </QueryState>
  )
}

interface Row {
  ingredientId: string
  quantity: string
}

function RecipeEditor({ target, onClose }: { target: RecipeTarget; onClose: () => void }) {
  const ingredients = useQuery({
    queryKey: ['inventory', 'ingredients'],
    queryFn: inventoryApi.ingredients,
  })
  const current = useQuery({
    queryKey: ['inventory', 'recipe', target.kind, target.itemId, target.size, target.toppingId],
    queryFn: () => inventoryApi.recipe(target),
  })
  return (
    <Modal title={`Công thức: ${target.name}`} onClose={onClose} wide>
      <QueryState
        isPending={current.isPending || ingredients.isPending}
        error={current.error ?? ingredients.error}
      >
        <Editor
          target={target}
          initial={current.data ?? []}
          ingredients={(ingredients.data ?? []).map((i) => ({
            id: i.id,
            label: `${i.name} (${i.unit})`,
          }))}
          onClose={onClose}
        />
      </QueryState>
    </Modal>
  )
}

function Editor({
  target,
  initial,
  ingredients,
  onClose,
}: {
  target: RecipeTarget
  initial: RecipeLine[]
  ingredients: { id: number; label: string }[]
  onClose: () => void
}) {
  const [rows, setRows] = useState<Row[]>(
    initial.length > 0
      ? initial.map((l) => ({ ingredientId: String(l.ingredientId), quantity: String(l.quantity) }))
      : [{ ingredientId: '', quantity: '' }],
  )
  const save = useAction(
    () =>
      inventoryApi.saveRecipe(
        target,
        rows
          .filter((r) => r.ingredientId && r.quantity)
          .map((r) => ({ ingredientId: Number(r.ingredientId), quantity: Number(r.quantity) })),
      ),
    {
      invalidate: [...KEY, ['inventory', 'recipe']],
      success: 'Đã lưu công thức',
      onDone: onClose,
    },
  )
  const set = (i: number, patch: Partial<Row>) =>
    setRows((cur) => cur.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  return (
    <div className="flex flex-col gap-3">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_7rem_auto] items-end gap-2">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Nguyên liệu
            <select
              value={r.ingredientId}
              onChange={(e) => set(i, { ingredientId: e.target.value })}
              className="min-h-11 rounded-xl border border-line bg-white/70 px-3 font-normal"
            >
              <option value="">— Chọn —</option>
              {ingredients.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Lượng dùng
            <input
              inputMode="decimal"
              value={r.quantity}
              onChange={(e) => set(i, { quantity: e.target.value.replace(/[^\d.]/g, '') })}
              className="min-h-11 rounded-xl border border-line bg-white/70 px-3 font-normal"
            />
          </label>
          <Button
            variant="ghost"
            aria-label="Bỏ dòng"
            onClick={() => setRows((cur) => cur.filter((_, idx) => idx !== i))}
          >
            Bỏ
          </Button>
        </div>
      ))}
      <div className="flex justify-between gap-3">
        <Button
          variant="secondary"
          onClick={() => setRows((cur) => [...cur, { ingredientId: '', quantity: '' }])}
        >
          Thêm nguyên liệu
        </Button>
        <Button loading={save.isPending} onClick={() => save.mutate(undefined)}>
          Lưu công thức
        </Button>
      </div>
    </div>
  )
}
