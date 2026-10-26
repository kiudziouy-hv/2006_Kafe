import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { Coffee } from 'lucide-react'
import { useState } from 'react'
import { QueryState } from '@/components/feedback/QueryState'
import { formatMoney } from '@/utils/format'
import { ordersApi, type MenuItem } from '../api/ordersApi'
import type { CartLine } from './Cart'
import { ItemOptionsModal } from './ItemOptionsModal'

/** Thực đơn đang bán theo nhóm; đơn mang đi chỉ hiện đồ uống lạnh và bánh (BR-013). */
export function MenuPicker({
  takeaway = false,
  onAdd,
}: {
  takeaway?: boolean
  onAdd: (line: CartLine) => void
}) {
  const menu = useQuery({ queryKey: ['ops', 'menu'], queryFn: ordersApi.menu })
  const [group, setGroup] = useState<string | null>(null)
  const [picked, setPicked] = useState<MenuItem | null>(null)
  const groups = menu.data?.groups ?? []
  const active = group ?? groups[0] ?? ''
  const items = (menu.data?.items ?? []).filter(
    (i) => i.group === active && (!takeaway || i.takeaway),
  )

  return (
    <QueryState isPending={menu.isPending} error={menu.error} onRetry={() => void menu.refetch()}>
      <div role="tablist" className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {groups.map((g) => (
          <button
            key={g}
            role="tab"
            type="button"
            aria-selected={active === g}
            onClick={() => setGroup(g)}
            className={clsx(
              'min-h-10 shrink-0 rounded-full px-4 font-semibold',
              active === g ? 'bg-coffee-700 text-ivory' : 'bg-white/60 hover:bg-coffee-100',
            )}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((i) => {
          const off = i.status !== 'ACTIVE'
          return (
            <button
              key={i.id}
              type="button"
              disabled={off}
              onClick={() => setPicked(i)}
              className="vt-hover-lift group flex flex-col overflow-hidden rounded-2xl border border-brass/50 bg-gradient-to-br from-ivory to-coffee-50 text-left hover:border-brass hover:from-coffee-50 hover:to-coffee-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="relative block aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-coffee-900 to-coffee-700">
                {i.imageUrl ? (
                  <img
                    src={i.imageUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center text-brass-light/80">
                    <Coffee size={34} strokeWidth={1.4} aria-hidden />
                  </span>
                )}
              </span>
              <span className="flex flex-col gap-0.5 p-3">
                <span className="font-semibold">{i.name}</span>
                <span className="text-sm text-ink-soft">
                  {off
                    ? i.status === 'OUT_OF_STOCK'
                      ? 'Hết hàng'
                      : 'Ngừng bán'
                    : `từ ${formatMoney(Math.min(...i.sizes.map((s) => s.price)))}`}
                </span>
              </span>
            </button>
          )
        })}
        {items.length === 0 && (
          <p className="col-span-full py-4 text-ink-soft">Không có món trong nhóm này.</p>
        )}
      </div>
      {picked && menu.data && (
        <ItemOptionsModal
          item={picked}
          toppings={menu.data.toppings}
          takeaway={takeaway}
          onAdd={onAdd}
          onClose={() => setPicked(null)}
        />
      )}
    </QueryState>
  )
}
