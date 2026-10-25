import { useNavigate } from 'react-router-dom'
import AccountMenu from '../../components/AccountMenu'
import TableCard from '../../components/TableCard'
import { AppHeader, NotificationBell, Screen } from '../../components/ui'
import { AREAS, useStore } from '../../store'

// S10 — Sơ đồ bàn (Phục vụ), kèm S10c chuông thông báo và S03a menu tài khoản
export default function TableMap() {
  const { tables } = useStore()
  const navigate = useNavigate()

  return (
    <Screen>
      <AppHeader
        title="Sơ đồ bàn"
        className="py-3"
        right={
          <>
            <AccountMenu name="Nhân viên mẫu A" role="Phục vụ" initials="VP" />
            <NotificationBell />
          </>
        }
      />
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 p-4">
        {AREAS.map((area) => (
          <section key={area} className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">{area}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {tables
                .filter((t) => t.area === area)
                .map((t) => (
                  <TableCard
                    key={t.id}
                    table={t}
                    onClick={() => navigate(t.status === 'free' ? `/phuc-vu/ban/${t.id}/goi-mon` : `/phuc-vu/ban/${t.id}`)}
                  />
                ))}
            </div>
          </section>
        ))}
        <p className="text-xs text-text-secondary">Chạm bàn Trống để tạo đơn; bàn có đơn để xem đơn.</p>
      </div>
    </Screen>
  )
}
