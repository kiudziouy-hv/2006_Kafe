import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { SelectField } from '@/components/ui/Field'
import { paymentsApi } from '../api/paymentsApi'

const KEY = 'vtph.cashier.staff'

function remembered(): string {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

/**
 * Thu ngân chọn nhân viên phụ trách đơn/hóa đơn trong số người đang chấm công (tài khoản quầy dùng chung không biết ai bấm).
 * Máy nhớ lựa chọn gần nhất. Chưa ai chấm công thì không bắt chọn: hóa đơn ghi theo tài khoản quầy.
 */
export function useStaffPicker() {
  const onDuty = useQuery({ queryKey: ['ops', 'on-duty'], queryFn: paymentsApi.onDuty })
  const [picked, setPicked] = useState(remembered)
  const list = onDuty.data ?? []
  const staffId = list.find((s) => String(s.id) === picked)?.id
  const required = list.length > 0
  const ready = !onDuty.isPending && (!required || staffId !== undefined)

  const picker = (
    <SelectField
      label="Nhân viên phụ trách"
      value={staffId === undefined ? '' : String(staffId)}
      disabled={!required}
      hint={
        required ? undefined : 'Chưa có thu ngân nào chấm công; hóa đơn ghi theo quầy thu ngân.'
      }
      onChange={(e) => {
        setPicked(e.target.value)
        try {
          localStorage.setItem(KEY, e.target.value)
        } catch {
          // Không lưu được thì lần sau chọn lại
        }
      }}
    >
      <option value="">{required ? 'Chọn nhân viên…' : 'Không có'}</option>
      {list.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </SelectField>
  )
  return { staffId, ready, picker }
}
