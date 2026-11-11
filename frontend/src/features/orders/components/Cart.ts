import type { MenuItem, MenuSize, MenuTopping, NewLine } from '../api/ordersApi'

/** Dòng món đang soạn ở giỏ trước khi gửi. */
export interface CartLine {
  key: number
  item: MenuItem
  size: MenuSize
  temp?: 'HOT' | 'COLD'
  sugar?: string
  ice?: string
  toppings: MenuTopping[]
  qty: number
}

let seq = 0
export const nextKey = () => ++seq

export const unitPrice = (l: CartLine) => l.size.price + l.toppings.reduce((s, t) => s + t.price, 0)
export const lineTotal = (l: CartLine) => unitPrice(l) * l.qty
export const cartTotal = (lines: CartLine[]) => lines.reduce((s, l) => s + lineTotal(l), 0)

export function toNewLines(lines: CartLine[]): NewLine[] {
  return lines.map((l) => ({
    itemId: l.item.id,
    size: l.size.code,
    qty: l.qty,
    temp: l.temp,
    sugar: l.sugar,
    ice: l.temp === 'HOT' ? undefined : l.ice,
    toppings: l.toppings.map((t) => t.id),
  }))
}
