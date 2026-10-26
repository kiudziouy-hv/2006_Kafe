import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { QueryState } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { NumberField, SelectField, TextField } from '@/components/ui/Field'
import { useAction } from '@/hooks/useAction'
import { formatDate, formatDateTime } from '@/utils/format'
import { inventoryApi, num, type ReceiptLineInput } from '../api/inventoryApi'

const KEYS = [['inventory']]

/** UC-18: lập phiếu nhập kho. Sữa tươi và bánh bắt buộc có hạn sử dụng theo từng phiếu (BR-017). */
export function StockInTab() {
  const ingredients = useQuery({
    queryKey: ['inventory', 'ingredients'],
    queryFn: inventoryApi.ingredients,
  })
  const receipts = useQuery({ queryKey: ['inventory', 'receipts'], queryFn: inventoryApi.receipts })
  const [ingredientId, setIngredientId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [expiry, setExpiry] = useState('')
  const [lines, setLines] = useState<(ReceiptLineInput & { label: string })[]>([])
  const picked = ingredients.data?.find((i) => String(i.id) === ingredientId)
  const submit = useAction(
    () =>
      inventoryApi.receive(
        lines.map(({ ingredientId, quantity, expiryDate }) => ({
          ingredientId,
          quantity,
          expiryDate,
        })),
      ),
    {
      invalidate: KEYS,
      success: (r) =>
        r.resold > 0 ? `Đã nhập kho, tự bán lại ${r.resold} mục hết hàng` : 'Đã nhập kho',
      onDone: () => setLines([]),
    },
  )
  const add = () => {
    if (!picked || !quantity) return
    setLines((cur) => [
      ...cur,
      {
        ingredientId: picked.id,
        quantity: Number(quantity),
        expiryDate: picked.trackExpiry ? expiry : undefined,
        label: `${picked.name} (${picked.unit})`,
      },
    ])
    setQuantity('')
    setExpiry('')
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h2 className="mb-3 text-lg font-bold">Phiếu nhập kho</h2>
        <QueryState isPending={ingredients.isPending} error={ingredients.error}>
          <div className="flex flex-col gap-3">
            <SelectField
              label="Nguyên liệu"
              value={ingredientId}
              onChange={(e) => setIngredientId(e.target.value)}
            >
              <option value="">— Chọn —</option>
              {(ingredients.data ?? []).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.unit})
                </option>
              ))}
            </SelectField>
            <NumberField label="Số lượng nhập" value={quantity} onValueChange={setQuantity} />
            {picked?.trackExpiry && (
              <TextField
                label="Hạn sử dụng (bắt buộc)"
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
              />
            )}
            <Button variant="secondary" disabled={!picked || !quantity} onClick={add}>
              Thêm vào phiếu
            </Button>
          </div>
        </QueryState>
        {lines.length > 0 && (
          <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-white/60">
            {lines.map((l, i) => (
              <li key={i} className="flex items-center justify-between gap-2 px-3 py-2">
                <span>
                  {l.label}: <b>{num(l.quantity)}</b>
                  {l.expiryDate ? ` · HSD ${formatDate(l.expiryDate)}` : ''}
                </span>
                <Button
                  variant="ghost"
                  onClick={() => setLines((cur) => cur.filter((_, idx) => idx !== i))}
                >
                  Bỏ
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button
          className="mt-4 w-full"
          disabled={lines.length === 0}
          loading={submit.isPending}
          onClick={() => submit.mutate(undefined)}
        >
          Xác nhận phiếu nhập
        </Button>
      </Card>
      <div>
        <h2 className="mb-2 text-lg font-bold">Lịch sử nhập kho</h2>
        <QueryState isPending={receipts.isPending} error={receipts.error}>
          <DataTable
            rows={receipts.data ?? []}
            rowKey={(r) => r.id}
            columns={[
              { header: 'Thời điểm', cell: (r) => formatDateTime(r.receivedAt) },
              { header: 'Nguyên liệu', cell: (r) => r.ingredient },
              { header: 'Số lượng', cell: (r) => `${num(r.quantity)} ${r.unit}` },
              { header: 'HSD', cell: (r) => (r.expiryDate ? formatDate(r.expiryDate) : '—') },
            ]}
          />
        </QueryState>
      </div>
    </div>
  )
}
