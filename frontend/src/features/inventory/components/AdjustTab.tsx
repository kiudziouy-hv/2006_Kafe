import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { QueryState } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { NumberField, SelectField, TextAreaField } from '@/components/ui/Field'
import { useAction } from '@/hooks/useAction'
import { formatDateTime } from '@/utils/format'
import { inventoryApi, num } from '../api/inventoryApi'

/** UC-19: điều chỉnh tồn kho theo số kiểm kê thực tế; lưu tồn trước/sau, lý do, người và thời điểm. */
export function AdjustTab() {
  const ingredients = useQuery({
    queryKey: ['inventory', 'ingredients'],
    queryFn: inventoryApi.ingredients,
  })
  const history = useQuery({
    queryKey: ['inventory', 'adjustments'],
    queryFn: inventoryApi.adjustments,
  })
  const [id, setId] = useState('')
  const [actual, setActual] = useState('')
  const [reason, setReason] = useState('')
  const picked = ingredients.data?.find((i) => String(i.id) === id)
  const diff = picked && actual !== '' ? Number(actual) - picked.currentStock : null
  const save = useAction(
    () => inventoryApi.adjust({ ingredientId: Number(id), actual: Number(actual), reason }),
    {
      invalidate: [['inventory']],
      success: 'Đã điều chỉnh tồn kho',
      onDone: () => {
        setActual('')
        setReason('')
      },
    },
  )
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h2 className="mb-3 text-lg font-bold">Điều chỉnh sau kiểm kê</h2>
        <div className="flex flex-col gap-3">
          <SelectField label="Nguyên liệu" value={id} onChange={(e) => setId(e.target.value)}>
            <option value="">— Chọn —</option>
            {(ingredients.data ?? []).map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} — tồn {num(i.currentStock)} {i.unit}
              </option>
            ))}
          </SelectField>
          <NumberField label="Số lượng kiểm kê thực tế" value={actual} onValueChange={setActual} />
          {diff !== null && (
            <p className={diff === 0 ? 'text-ink-soft' : diff < 0 ? 'text-danger' : 'text-success'}>
              Chênh lệch: {diff > 0 ? '+' : ''}
              {num(diff)} {picked?.unit}
            </p>
          )}
          <TextAreaField
            label="Lý do điều chỉnh (bắt buộc)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button
            disabled={!id || actual === '' || !reason.trim()}
            loading={save.isPending}
            onClick={() => save.mutate(undefined)}
          >
            Xác nhận điều chỉnh
          </Button>
        </div>
      </Card>
      <div>
        <h2 className="mb-2 text-lg font-bold">Lịch sử điều chỉnh</h2>
        <QueryState isPending={history.isPending} error={history.error}>
          <DataTable
            rows={history.data ?? []}
            rowKey={(a) => a.id}
            columns={[
              { header: 'Thời điểm', cell: (a) => formatDateTime(a.adjustedAt) },
              { header: 'Nguyên liệu', cell: (a) => a.ingredient },
              {
                header: 'Trước → sau',
                cell: (a) => `${num(a.quantityBefore)} → ${num(a.quantityAfter)} ${a.unit}`,
              },
              { header: 'Lý do', cell: (a) => a.reason },
              { header: 'Người làm', cell: (a) => a.adjustedBy },
            ]}
          />
        </QueryState>
      </div>
    </div>
  )
}
