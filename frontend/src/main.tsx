import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { StoreProvider } from './store'
import StaffLogin from './pages/StaffLogin'
import ManagerLogin from './pages/ManagerLogin'
import Profile from './pages/Profile'
import Logout from './pages/Logout'
import TimeClock from './pages/TimeClock'
import TableMap from './pages/waiter/TableMap'
import OrderMenu from './pages/waiter/OrderMenu'
import OrderDetail from './pages/waiter/OrderDetail'
import TransferTable from './pages/waiter/TransferTable'
import CashierTables from './pages/cashier/CashierTables'
import Takeaway from './pages/cashier/Takeaway'
import Payment from './pages/cashier/Payment'
import Drafts from './pages/cashier/Drafts'
import CloseShift from './pages/cashier/CloseShift'
import ShiftInvoices from './pages/cashier/ShiftInvoices'
import Barista from './pages/barista/Barista'
import Report from './pages/owner/Report'
import Invoices from './pages/owner/Invoices'
import Promotions from './pages/owner/Promotions'
import Dishes from './pages/owner/Dishes'
import Toppings from './pages/owner/Toppings'
import Ingredients from './pages/owner/Ingredients'
import Recipes from './pages/owner/Recipes'
import StockImport from './pages/owner/StockImport'
import StockAdjust from './pages/owner/StockAdjust'
import Wastes from './pages/owner/Wastes'
import StockAlerts from './pages/owner/StockAlerts'
import Staff from './pages/owner/Staff'
import Attendance from './pages/owner/Attendance'
import CloseDay from './pages/owner/CloseDay'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dang-nhap" replace />} />
          <Route path="/dang-nhap" element={<StaffLogin />} />
          <Route path="/dang-nhap/quan-ly" element={<ManagerLogin />} />
          <Route path="/cham-cong" element={<TimeClock />} />
          <Route path="/ho-so" element={<Profile />} />
          <Route path="/dang-xuat" element={<Logout />} />

          <Route path="/phuc-vu" element={<TableMap />} />
          <Route path="/phuc-vu/ban/:id" element={<OrderDetail />} />
          <Route path="/phuc-vu/ban/:id/goi-mon" element={<OrderMenu />} />
          <Route path="/phuc-vu/ban/:id/chuyen-ban" element={<TransferTable />} />

          <Route path="/thu-ngan" element={<CashierTables />} />
          <Route path="/thu-ngan/mang-di" element={<Takeaway />} />
          <Route path="/thu-ngan/thanh-toan/:id" element={<Payment />} />
          <Route path="/thu-ngan/don-nhap" element={<Drafts />} />
          <Route path="/thu-ngan/chot-ca" element={<CloseShift />} />
          <Route path="/thu-ngan/hoa-don" element={<ShiftInvoices />} />

          <Route path="/pha-che" element={<Barista />} />

          <Route path="/quan-ly" element={<Navigate to="/quan-ly/bao-cao" replace />} />
          <Route path="/quan-ly/bao-cao" element={<Report />} />
          <Route path="/quan-ly/hoa-don" element={<Invoices />} />
          <Route path="/quan-ly/khuyen-mai" element={<Promotions />} />
          <Route path="/quan-ly/mon" element={<Dishes />} />
          <Route path="/quan-ly/topping" element={<Toppings />} />
          <Route path="/quan-ly/nguyen-lieu" element={<Ingredients />} />
          <Route path="/quan-ly/cong-thuc" element={<Recipes />} />
          <Route path="/quan-ly/nhap-kho" element={<StockImport />} />
          <Route path="/quan-ly/dieu-chinh-ton" element={<StockAdjust />} />
          <Route path="/quan-ly/hao-hut" element={<Wastes />} />
          <Route path="/quan-ly/canh-bao-kho" element={<StockAlerts />} />
          <Route path="/quan-ly/nhan-vien" element={<Staff />} />
          <Route path="/quan-ly/cham-cong" element={<Attendance />} />
          <Route path="/quan-ly/chot-ngay" element={<CloseDay />} />
          <Route path="*" element={<Navigate to="/dang-nhap" replace />} />
        </Routes>
      </StoreProvider>
    </BrowserRouter>
  </StrictMode>,
)
