import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { NumberField, SelectField, TextAreaField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useAction } from '@/hooks/useAction'
import { inventoryApi } from '../api/inventoryApi'

/** Biểu mẫu đề xuất hao hụt, dùng cho Pha chế (UC-20) và Chủ quán/Quản lý. */
export function WasteForm({ onClose }: { onClose: () => void }) {
  const ingredients = useQuery({
    queryKey: ['inventory', 'ingredients'],
    queryFn: inventoryApi.ingredients,
  })
  const [id, setId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const save = useAction(
    () =>
      inventoryApi.proposeWaste({ ingredientId: Number(id), quantity: Number(quantity), reason }),
    { invalidate: [['inventory', 'waste']], success: 'Đã gửi đề xuất hao hụt', onDone: onClose },
  )
  return (
    <Modal title="Đề xuất hao hụt" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <SelectField label="Nguyên liệu" value={id} onChange={(e) => setId(e.target.value)}>
          <option value="">— Chọn —</option>
          {(ingredients.data ?? []).map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} ({i.unit})
            </option>
          ))}
        </SelectField>
        <NumberField label="Số lượng hao hụt" value={quantity} onValueChange={setQuantity} />
        <TextAreaField label="Lý do" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button
          disabled={!id || !quantity || !reason.trim()}
          loading={save.isPending}
          onClick={() => save.mutate(undefined)}
        >
          Gửi đề xuất
        </Button>
      </div>
    </Modal>
  )
}
