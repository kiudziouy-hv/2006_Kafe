import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { HOME_BY_ROLE, LoginPage, RequireRole, useAuth } from '@/features/auth'

// Tách mã theo vai trò: màn Phục vụ trên điện thoại không phải tải mã của Quản lý.
const KitchenBoardPage = lazy(() => import('@/features/kitchen/pages/KitchenBoardPage'))
const PaymentsPage = lazy(() => import('@/features/payments/pages/PaymentsPage'))
const TablesPage = lazy(() => import('@/features/tables/pages/TablesPage'))
const OrderPage = lazy(() => import('@/features/orders/pages/OrderPage'))
const MenuPage = lazy(() => import('@/features/menu/pages/MenuPage'))
const InventoryPage = lazy(() => import('@/features/inventory/pages/InventoryPage'))
const InvoicesPage = lazy(() => import('@/features/invoices/pages/InvoicesPage'))
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage'))
const CustomersPage = lazy(() => import('@/features/customers/pages/CustomersPage'))
const StaffPage = lazy(() => import('@/features/staff/pages/StaffPage'))
const ProfilePage = lazy(() => import('@/features/staff/pages/ProfilePage'))
const AttendanceKioskPage = lazy(() => import('@/features/staff/pages/AttendanceKioskPage'))
const AdminLayout = lazy(() => import('@/layouts/AdminLayout'))
const CashierLayout = lazy(() => import('@/layouts/CashierLayout'))
const KitchenLayout = lazy(() => import('@/layouts/KitchenLayout'))
const ServiceLayout = lazy(() => import('@/layouts/ServiceLayout'))

function HomeRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  return <Navigate to={user ? HOME_BY_ROLE[user.role] : '/login'} replace />
}

export function AppRoutes() {
  return (
    <Suspense fallback={<p className="p-8 text-ink-soft">Đang tải…</p>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/attendance" element={<AttendanceKioskPage />} />

        <Route element={<RequireRole roles={['OWNER']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<ReportsPage />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="tables" element={<TablesPage />} />
            <Route path="tables/:no" element={<OrderPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route element={<RequireRole roles={['WAITER']} />}>
          <Route path="/service" element={<ServiceLayout />}>
            <Route index element={<TablesPage />} />
            <Route path="tables" element={<TablesPage />} />
            <Route path="tables/:no" element={<OrderPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route element={<RequireRole roles={['CASHIER']} />}>
          <Route path="/cashier" element={<CashierLayout />}>
            <Route index element={<PaymentsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route element={<RequireRole roles={['BARISTA']} />}>
          <Route path="/kitchen" element={<KitchenLayout />}>
            <Route index element={<KitchenBoardPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </Suspense>
  )
}
