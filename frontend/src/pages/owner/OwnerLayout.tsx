import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AccountMenuPanel } from '../../components/AccountMenu'
import { NotificationBell } from '../../components/ui'
import beanLeft from '../../assets/bean-sm-left.svg'
import beanRight from '../../assets/bean-sm-right.svg'
import logoImg from '../../assets/badge.png'
import iconCollapse from '../../assets/icons/sb-collapse.svg'
import iconDown from '../../assets/icons/sb-chevron-down.svg'
import iconRight from '../../assets/icons/sb-chevron-right.svg'
import iReport from '../../assets/icons/nav-report.svg'
import iInvoice from '../../assets/icons/nav-invoice.svg'
import iPromo from '../../assets/icons/nav-promo.svg'
import iDish from '../../assets/icons/nav-dish.svg'
import iTopping from '../../assets/icons/nav-topping.svg'
import iStock from '../../assets/icons/nav-stock.svg'
import iRecipe from '../../assets/icons/nav-recipe.svg'
import iAlert from '../../assets/icons/nav-alert.svg'
import iStaff from '../../assets/icons/nav-staff.svg'
import iClock from '../../assets/icons/nav-clock.svg'

const GROUPS = [
  {
    title: 'BÁN HÀNG',
    items: [
      { to: '/quan-ly/bao-cao', label: 'Báo cáo doanh thu', icon: iReport },
      { to: '/quan-ly/hoa-don', label: 'Hóa đơn', icon: iInvoice },
      { to: '/quan-ly/khuyen-mai', label: 'Khuyến mãi', icon: iPromo },
    ],
  },
  {
    title: 'THỰC ĐƠN',
    items: [
      { to: '/quan-ly/mon', label: 'Món', icon: iDish },
      { to: '/quan-ly/topping', label: 'Topping', icon: iTopping },
    ],
  },
  {
    title: 'KHO',
    items: [
      { to: '/quan-ly/nguyen-lieu', label: 'Nguyên liệu & tồn kho', icon: iStock },
      { to: '/quan-ly/cong-thuc', label: 'Công thức', icon: iRecipe },
      { to: '/quan-ly/nhap-kho', label: 'Nhập kho', icon: iStock },
      { to: '/quan-ly/dieu-chinh-ton', label: 'Điều chỉnh tồn kho', icon: iStock },
      { to: '/quan-ly/hao-hut', label: 'Hao hụt', icon: iStock },
      { to: '/quan-ly/canh-bao-kho', label: 'Cảnh báo kho', icon: iAlert },
    ],
  },
  {
    title: 'NHÂN SỰ & CA',
    items: [
      { to: '/quan-ly/nhan-vien', label: 'Nhân viên', icon: iStaff },
      { to: '/quan-ly/cham-cong', label: 'Chấm công', icon: iClock },
      { to: '/quan-ly/chot-ngay', label: 'Ca & chốt ngày', icon: iClock },
    ],
  },
]

const COLLAPSE_KEY = 'kafe.sidebar.collapsed'

// Khung màn Chủ quán (1440×900): sidebar kính mờ (mở rộng/thu gọn, gập nhóm) + Top Navigation
export default function OwnerLayout({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GROUPS.map((g) => [g.title, g.items.some((i) => pathname.startsWith(i.to))])),
  )
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      /* bỏ qua khi trình duyệt chặn lưu trữ */
    }
  }, [collapsed])

  useEffect(() => {
    if (!menu) return
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menu])

  return (
    <div className="flex min-h-screen gap-4 bg-bg-canvas p-4">
      <aside
        className={`sticky top-4 flex h-[calc(100vh-32px)] shrink-0 flex-col gap-2 overflow-y-auto rounded-[28px] border border-glass-stroke bg-glass-fill p-4 shadow-glass backdrop-blur-md transition-[width] ${
          collapsed ? 'w-[76px] items-center' : 'w-[260px]'
        }`}
      >
        <div className={`flex w-full items-center gap-3 ${collapsed ? 'flex-col' : ''}`}>
          <img src={logoImg} alt="2006 Kafé" className="size-9 shrink-0 rounded-xl bg-action-primary object-cover" />
          {!collapsed && (
            <div className="flex flex-1 items-center text-base font-semibold">
              2
              <img src={beanLeft} alt="" className="mx-px h-[12.8px] w-[9px] rotate-[8deg]" />
              <img src={beanRight} alt="" className="mx-px h-[12.8px] w-[9px] -rotate-[8deg]" />
              6<span className="ml-[4.8px]">Kafé</span>
            </div>
          )}
          <button
            type="button"
            aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            onClick={() => setCollapsed(!collapsed)}
            className="flex size-8 shrink-0 items-center justify-center rounded-md border border-glass-stroke bg-glass-fill-strong"
          >
            <img src={iconCollapse} alt="" className={`size-4 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
        <div className="h-px w-full bg-glass-divider" />
        {!collapsed && <p className="text-xs font-semibold text-text-secondary">MENU</p>}

        {GROUPS.map((g) => (
          <div key={g.title} className="flex w-full flex-col gap-2">
            {collapsed ? (
              <div className="mx-auto my-1 h-px w-6 bg-glass-divider" />
            ) : (
              <button type="button" onClick={() => setOpen({ ...open, [g.title]: !open[g.title] })} className="flex items-center gap-2 px-3 py-2 text-left">
                <span className="flex-1 text-xs font-semibold text-text-secondary">{g.title}</span>
                <img src={open[g.title] ? iconDown : iconRight} alt="" className="size-4" />
              </button>
            )}
            {(collapsed || open[g.title]) &&
              g.items.map((i) => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  title={i.label}
                  className={({ isActive }) =>
                    `flex h-11 items-center gap-3 rounded-full p-3 text-sm ${collapsed ? 'w-11 justify-center' : 'w-full'} ${
                      isActive ? 'border border-glass-stroke bg-glass-fill-strong font-semibold' : 'hover:bg-white/40'
                    }`
                  }
                >
                  <img src={i.icon} alt="" className="size-5 shrink-0" />
                  {!collapsed && <span className="flex-1">{i.label}</span>}
                </NavLink>
              ))}
          </div>
        ))}

        <div className="flex-1" />
        <div className="h-px w-full bg-glass-divider" />
        <div ref={menuRef} className="relative w-full">
          <button
            type="button"
            onClick={() => setMenu(!menu)}
            className={`flex w-full items-center gap-3 rounded-full bg-glass-fill p-2 text-left ${collapsed ? 'justify-center' : ''}`}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-muted text-xs font-semibold">VP</span>
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Chủ quán mẫu</span>
                  <span className="block text-[11px] text-text-secondary">Chủ quán / Quản lý</span>
                </span>
                <img src={iconRight} alt="" className="size-4" />
              </>
            )}
          </button>
          {menu && (
            <AccountMenuPanel
              name="Chủ quán mẫu"
              role="Chủ quán / Quản lý"
              initials="VP"
              className="absolute bottom-0 left-[calc(100%+12px)] z-50 w-[240px]"
              onProfile={() => navigate('/ho-so')}
              onLogout={() => navigate('/dang-xuat')}
            />
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-4">
        <header className="sticky top-4 z-30 flex items-center gap-4 rounded-2xl border border-glass-stroke bg-glass-fill px-6 py-3 drop-shadow-[0_8px_12px_rgba(58,36,16,0.18)] backdrop-blur-md">
          <h1 className="min-w-0 flex-1 text-xl leading-7 font-semibold">{title}</h1>
          {right}
          <NotificationBell />
        </header>
        <div className="flex flex-1 animate-page-in flex-col gap-4 p-6 pt-2">{children}</div>
      </main>
    </div>
  )
}
