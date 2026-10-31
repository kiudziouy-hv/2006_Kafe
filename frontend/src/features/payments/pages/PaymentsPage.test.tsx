import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderApp } from '@/test/renderWithProviders'
import { paymentsApi } from '../api/paymentsApi'
import PaymentsPage from './PaymentsPage'

vi.mock('../api/paymentsApi', () => ({
  paymentsApi: {
    shift: vi.fn(),
    openShift: vi.fn(),
    closeShift: vi.fn(),
    pending: vi.fn(),
    drafts: vi.fn(),
    handovers: vi.fn(),
    onDuty: vi.fn(),
  },
}))
vi.mock('@/features/orders/api/ordersApi', async (orig) => ({
  ...(await orig<object>()),
  ordersApi: {
    menu: vi.fn().mockResolvedValue({ items: [], toppings: [], groups: [] }),
    quote: vi.fn(),
  },
}))
const api = vi.mocked(paymentsApi)

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
  it('mở ca ở tab Ca thu ngân thì Chờ thanh toán và Đơn mang đi mở khóa ngay', async () => {
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
    api.onDuty.mockResolvedValue([])

    renderApp(<PaymentsPage />)

    expect(await screen.findByText(/Chưa mở ca thu ngân, cần mở ca trước/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /Ca thu ngân/ }))
    fireEvent.click((await screen.findAllByRole('button', { name: 'Mở ca' }))[0]!)

    await waitFor(() => expect(api.openShift).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('tab', { name: /Chờ thanh toán/ }))
    expect(await screen.findByText('Chưa có đơn nào chờ thanh toán.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /Đơn mang đi/ }))
    expect(await screen.findByText('Chọn món mang đi')).toBeInTheDocument()
    expect(
      screen.queryByText(/Cần mở ca thu ngân mới tạo được đơn mang đi/),
    ).not.toBeInTheDocument()
  })
})
