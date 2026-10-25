import { useNavigate } from 'react-router-dom'
import TableCard from '../../components/TableCard'
import { AREAS, useStore } from '../../store'
import CashierLayout from './CashierLayout'

// S22 — Sơ đồ bàn (Thu ngân, chỉ xem) · UC-07, UC-22; S20 mở ca nằm trong CashierLayout
export default function CashierTables() {
  const { tables, toast } = useStore()
  const navigate = useNavigate()

  return (
    <CashierLayout title="Sơ đồ bàn">
      <div className="flex flex-col gap-3">
        {AREAS.map((area, i) => {
          const list = tables.filter((t) => t.area === area)
          return (
            <section key={area} className="flex flex-col gap-3">
              <h2 className="text-base font-semibold">
                {i === 0 ? 'Trong nhà' : 'Ngoài trời'} ({list.length} bàn)
              </h2>
              <div className={`grid grid-cols-2 gap-3 sm:grid-cols-4 ${i === 0 ? 'lg:grid-cols-8' : 'lg:grid-cols-6'}`}>
                {list.map((t) => (
                  <TableCard
                    key={t.id}
                    table={t}
                    onClick={() =>
                      t.status === 'waiting'
                        ? navigate(`/thu-ngan/thanh-toan/${t.id}`)
                        : toast({ type: 'info', title: `${t.name} · chỉ xem`, message: 'Chỉ thanh toán được bàn Chờ thanh toán.' })
                    }
                  />
                ))}
              </div>
            </section>
          )
        })}
        <p className="text-xs text-text-secondary">
          Thu ngân chỉ xem sơ đồ bàn. Chạm bàn Chờ thanh toán để thanh toán (UC-22). Tạo đơn, gọi thêm món, chuyển bàn do Phục vụ thực hiện.
        </p>
      </div>
    </CashierLayout>
  )
}
