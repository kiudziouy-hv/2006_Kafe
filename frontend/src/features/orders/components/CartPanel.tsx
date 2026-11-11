import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatMoney } from '@/utils/format'
import { ICE_LABEL } from '../api/ordersApi'
import { cartTotal, lineTotal, type CartLine } from './Cart'

export function describeCartLine(l: CartLine): string {
  return [
    l.item.cake ? null : `Cỡ ${l.size.code}`,
    l.temp === 'HOT' ? 'Nóng' : l.temp === 'COLD' ? 'Lạnh' : null,
    l.sugar ? `Đường ${l.sugar}%` : null,
    l.ice ? ICE_LABEL[l.ice] : null,
    ...l.toppings.map((t) => t.name),
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Giỏ các dòng món đang soạn (chưa gửi, chỉ là bản nháp): đổi số lượng, bỏ dòng là biến mất ngay, tạm tính (khuyến mãi do hệ thống áp dụng khi xác nhận). */
export function CartPanel({
  lines,
  onChange,
}: {
  lines: CartLine[]
  onChange: (lines: CartLine[]) => void
}) {
  if (lines.length === 0) return <p className="py-4 text-ink-soft">Chưa chọn món nào.</p>
  return (
    <div>
      <ul className="divide-y divide-line">
        {lines.map((l) => (
          <li key={l.key} className="flex items-start justify-between gap-2 py-2">
            <div>
              <p className="font-semibold">{l.item.name}</p>
              <p className="text-xs text-ink-soft">{describeCartLine(l)}</p>
              <p className="text-sm">{formatMoney(lineTotal(l))}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                aria-label={`Bỏ ${l.item.name} khỏi danh sách`}
                title="Bỏ món này"
                className="px-3 !text-danger"
                onClick={() => onChange(lines.filter((x) => x.key !== l.key))}
              >
                <Trash2 size={17} aria-hidden />
              </Button>
              <Button
                variant="secondary"
                aria-label={`Giảm ${l.item.name}`}
                className="px-3"
                onClick={() =>
                  onChange(
                    l.qty <= 1
                      ? lines.filter((x) => x.key !== l.key)
                      : lines.map((x) => (x.key === l.key ? { ...x, qty: x.qty - 1 } : x)),
                  )
                }
              >
                −
              </Button>
              <span className="w-6 text-center font-bold">{l.qty}</span>
              <Button
                variant="secondary"
                aria-label={`Tăng ${l.item.name}`}
                className="px-3"
                disabled={l.qty >= 20}
                onClick={() =>
                  onChange(lines.map((x) => (x.key === l.key ? { ...x, qty: x.qty + 1 } : x)))
                }
              >
                +
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 flex justify-between text-lg font-bold">
        <span>Tạm tính</span>
        <span>{formatMoney(cartTotal(lines))}</span>
      </p>
    </div>
  )
}
