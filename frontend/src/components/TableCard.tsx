import type { Table } from '../store'

const label = { free: 'Trống', busy: 'Đang phục vụ', waiting: 'Chờ thanh toán' }
const style = {
  free: 'bg-table-free border-solid',
  busy: 'bg-table-busy border-solid',
  waiting: 'bg-table-waiting border-dashed',
}

// Table Card (Figma 28:329): luôn có chữ trạng thái, không chỉ dùng màu.
export default function TableCard({ table, selected, onClick }: { table: Table; selected?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`hover-lift flex flex-col items-start gap-1 rounded-xl p-4 text-left hover:brightness-[0.98] ${style[table.status]} ${
        selected ? 'border-3 border-action-primary' : 'border border-border-strong'
      }`}
    >
      <span className="text-base leading-6 font-semibold">{table.name}</span>
      <span className="text-xs leading-4">{label[table.status]}</span>
    </button>
  )
}
