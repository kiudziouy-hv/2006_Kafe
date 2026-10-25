import { useState } from 'react'
import { EmptyState } from '../../components/ui'
import { Panel, RowMenu, Table } from '../../components/Table'
import WasteForm from '../../components/WasteForm'
import { Badge } from '../../components/ui'
import { useStore } from '../../store'
import { usePersist } from '../../usePersist'
import OwnerLayout from './OwnerLayout'

type Lot = { id: string; ingredient: string; expiry: string; qty: number; unit: string; expired: boolean }

const LOTS: Lot[] = [
  { id: 'PN mẫu 1', ingredient: 'Sữa tươi', expiry: '22/10', qty: 3000, unit: 'ml', expired: false },
  { id: 'PN mẫu 2', ingredient: 'Bánh mẫu 1', expiry: '19/10', qty: 4, unit: 'cái', expired: true },
]

// S50 — Cảnh báo kho; S50b — không có cảnh báo; S50c — Lập hao hụt từ cảnh báo
export default function StockAlerts() {
  const { ingredients, addWaste, changeStock, toast } = useStore()
  const [lots, setLots] = usePersist('lots', LOTS)
  const [fromLot, setFromLot] = useState<Lot | null>(null)
  const low = ingredients.filter((i) => i.stock < i.min)

  return (
    <OwnerLayout title="Cảnh báo tồn kho và hạn sử dụng">
      {low.length === 0 && lots.length === 0 ? (
        <EmptyState title="Không có cảnh báo" message="Tất cả nguyên liệu đều trên mức tối thiểu và chưa có lô nào sắp hết hạn." />
      ) : (
        <>
          <Panel title="Dưới mức tồn tối thiểu">
            <Table
              rows={low}
              rowKey={(r) => r.id}
              empty="Không có nguyên liệu nào dưới mức tối thiểu."
              cols={[
                { head: 'Nguyên liệu', cell: (r) => r.name },
                { head: 'Tồn hiện tại', cell: (r) => <Badge label={`${r.stock.toLocaleString('vi-VN')} ${r.unit}`} tone="warning" /> },
                { head: 'Tối thiểu', cell: (r) => `${r.min.toLocaleString('vi-VN')} ${r.unit}`, className: 'text-right' },
              ]}
            />
          </Panel>
          <Panel title="Sắp hết hạn (từ 2 ngày trước hạn)">
            <Table
              rows={lots}
              rowKey={(r) => r.id}
              empty="Không có lô nào sắp hết hạn."
              cols={[
                { head: 'Phiếu nhập', cell: (r) => r.id },
                { head: 'Nguyên liệu', cell: (r) => r.ingredient },
                { head: 'Hạn sử dụng', cell: (r) => r.expiry },
                { head: 'SL cần kiểm tra', cell: (r) => `${r.qty.toLocaleString('vi-VN')} ${r.unit}`, className: 'text-right' },
                { head: 'Trạng thái', cell: (r) => (r.expired ? <Badge label="Đã hết hạn" tone="error" /> : <Badge label="Sắp hết hạn" tone="warning" />) },
                { head: 'Thao tác', cell: (r) => (r.expired ? <RowMenu actions={[{ label: 'Lập hao hụt từ cảnh báo', onClick: () => setFromLot(r) }]} /> : '—') },
              ]}
            />
          </Panel>
        </>
      )}
      {fromLot && (
        <WasteForm
          title="Lập hao hụt từ cảnh báo"
          submitLabel="Lập phiếu hao hụt"
          by="Chủ quán mẫu"
          status="confirmed"
          initialIngredient={fromLot.ingredient}
          note={`Từ ${fromLot.id} · hạn ${fromLot.expiry}. Phiếu được xác nhận ngay và trừ kho.`}
          onClose={() => setFromLot(null)}
          onDone={(w) => {
            addWaste(w)
            changeStock(w.ingredient, -w.qty)
            setLots(lots.filter((l) => l.id !== fromLot.id))
            setFromLot(null)
            toast({ type: 'success', title: 'Đã lập phiếu hao hụt', message: `${w.ingredient} · ${w.qty} ${w.unit}` })
          }}
        />
      )}
    </OwnerLayout>
  )
}
