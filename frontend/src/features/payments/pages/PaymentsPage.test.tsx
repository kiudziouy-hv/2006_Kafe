import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { tablesApi } from '@/features/tables/api/tablesApi'
import { renderApp } from '@/test/renderWithProviders'
import type { DiningTable } from '@/types/api'
import { paymentsApi, type PayOrder } from '../api/paymentsApi'
import PaymentsPage from './PaymentsPage'

vi.mock('../api/paymentsApi', () => ({
  paymentsApi: {
    shift: vi.fn(),
    openShift: vi.fn(),
    closeShift: vi.fn(),
    pending: vi.fn(),
    drafts: vi.fn(),
    handovers: vi.fn(),
  },
}))
vi.mock('@/features/orders/api/ordersApi', async (orig) => ({
  ...(await orig<object>()),
  ordersApi: {
    menu: vi.fn().mockResolvedValue({ items: [], toppings: [], groups: [] }),
    quote: vi.fn(),
  },
}))
vi.mock('@/features/tables/api/tablesApi', () => ({
  tablesApi: { list: vi.fn(), finish: vi.fn() },
}))
const api = vi.mocked(paymentsApi)
const tables = vi.mocked(tablesApi)

const closedDay = {
  date: '2026-11-01',
  shifts: [],
  cashTotal: 0,
  transferTotal: 0,
  invoiceCount: 0,
}
const openShift = {
  id: 1,
  type: 'MORNING' as const,
  openingCash: 0,
  open: true,
  businessDate: '2026-11-01',
  cashSales: 0,
  invoiceCount: 0,
  expectedCash: null,
  actualCash: null,
  diff: null,
  closedAt: null,
  transferSales: 0,
  transferCount: 0,
}

describe('Màn thu ngân: đồng bộ trạng thái ca', () => {
  it('mở ca ở tab Ca thu ngân thì Đơn mang đi mở khóa ngay', async () => {
    let opened = false
    api.shift.mockImplementation(async () =>
      opened
        ? {
            open: true,
            shift: openShift,
            expected: 0,
            cashSales: 0,
            days: [{ ...closedDay, shifts: [openShift] }],
          }
        : { open: false, shift: null, days: [closedDay] },
    )
    api.openShift.mockImplementation(async () => {
      opened = true
      return {}
    })
    api.pending.mockResolvedValue([])
    api.drafts.mockResolvedValue([])
    api.handovers.mockResolvedValue([])

    renderApp(<PaymentsPage />)

    fireEvent.click(await screen.findByRole('tab', { name: /Đơn mang đi/ }))
    expect(
      await screen.findByText(/Cần mở ca thu ngân mới tạo được đơn mang đi/),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /Ca thu ngân/ }))
    fireEvent.click((await screen.findAllByRole('button', { name: 'Mở ca' }))[0]!)

    await waitFor(() => expect(api.openShift).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('tab', { name: /Đơn mang đi/ }))
    expect(await screen.findByText('Chọn món mang đi')).toBeInTheDocument()
    expect(
      screen.queryByText(/Cần mở ca thu ngân mới tạo được đơn mang đi/),
    ).not.toBeInTheDocument()
  })
})

// 14 bàn: 1..8 Trong nhà, 9..14 Ngoài trời; bàn 2 Đang phục vụ, bàn 3 Chờ thanh toán, còn lại Trống
const map: DiningTable[] = Array.from({ length: 14 }, (_, i) => ({
  no: i + 1,
  zone: i < 8 ? 'Trong nhà' : 'Ngoài trời',
  status: i === 1 ? 'SERVING' : i === 2 ? 'WAITING_PAY' : 'EMPTY',
  orderId: i === 1 ? 20 : i === 2 ? 30 : null,
}))
const order = (id: number, tableNo: number, waitingPay: boolean) =>
  ({
    id,
    type: 'DINE',
    tableNo,
    waitingPay,
    rounded: 61000,
    discount: 0,
    lines: [],
  }) as unknown as PayOrder

describe('Màn thu ngân: sơ đồ bàn chỉ xem (S22, UC-07)', () => {
  const openState = { open: true, shift: openShift, expected: 0, cashSales: 0, days: [] }
  const showMap = async (
    shiftOpen: boolean,
    pending = [order(20, 2, false), order(30, 3, true)],
  ) => {
    api.shift.mockResolvedValue(
      shiftOpen ? openState : { open: false, shift: null, days: [closedDay] },
    )
    api.pending.mockResolvedValue(pending)
    tables.list.mockResolvedValue(map)
    renderApp(<PaymentsPage />)
    fireEvent.click(await screen.findByRole('tab', { name: /Sơ đồ bàn/ }))
    await screen.findByText('Bàn 14')
  }

  it('thấy đủ 14 bàn chia hai khu, không có nút Khách đã dùng xong', async () => {
    await showMap(true)
    const inside = screen.getByRole('heading', { name: 'Trong nhà' }).closest('section')!
    const outside = screen.getByRole('heading', { name: 'Ngoài trời' }).closest('section')!
    expect(within(inside).getAllByRole('heading', { name: /^Bàn \d+$/ })).toHaveLength(8)
    expect(within(outside).getAllByRole('heading', { name: /^Bàn \d+$/ })).toHaveLength(6)
    expect(screen.queryByRole('button', { name: 'Khách đã dùng xong' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Chưa thể thanh toán')).toBeInTheDocument()
    expect(await screen.findByText(/61\.000/)).toBeInTheDocument()
  })

  it('bấm bàn Trống hoặc Đang phục vụ không mở thanh toán; bấm bàn Chờ thanh toán thì mở đúng bàn', async () => {
    await showMap(true)
    fireEvent.click(screen.getByText('Bàn 1'))
    fireEvent.click(screen.getByText('Bàn 2'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('where')).toHaveTextContent('/login')

    fireEvent.click(screen.getByRole('button', { name: 'Thanh toán bàn 3' }))
    expect(await screen.findByRole('dialog', { name: 'Thanh toán bàn 3' })).toBeInTheDocument()
  })

  it('bàn Chờ thanh toán nhưng danh sách thu tiền không còn đơn (vừa thu ở máy khác) thì báo, không mở dialog', async () => {
    await showMap(true, [])
    fireEvent.click(screen.getByRole('button', { name: 'Thanh toán bàn 3' }))
    expect(await screen.findByText('Bàn này không còn chờ thanh toán')).toBeInTheDocument()
    expect(api.pending.mock.calls.length).toBeGreaterThan(1) // đã tải lại trước khi báo
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('chưa mở ca vẫn xem được sơ đồ, bấm bàn Chờ thanh toán thì yêu cầu mở ca', async () => {
    await showMap(false)
    expect(screen.queryByText(/Chưa mở ca thu ngân/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Thanh toán bàn 3' }))
    expect(await screen.findByText(/Chưa mở ca thu ngân, cần mở ca trước/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mở ca thu ngân' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
