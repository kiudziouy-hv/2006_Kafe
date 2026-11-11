import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderApp } from '@/test/renderWithProviders'
import type { DiningTable } from '@/types/api'
import { tablesApi } from '../api/tablesApi'
import TablesPage from './TablesPage'

vi.mock('../api/tablesApi', () => ({ tablesApi: { list: vi.fn(), finish: vi.fn() } }))
const api = vi.mocked(tablesApi)

const map: DiningTable[] = [
  { no: 1, zone: 'Trong nhà', status: 'EMPTY', orderId: null },
  { no: 2, zone: 'Trong nhà', status: 'SERVING', orderId: 20 },
  { no: 9, zone: 'Ngoài trời', status: 'WAITING_PAY', orderId: 30 },
]

describe('Sơ đồ bàn của Phục vụ (hồi quy sau khi tách TableGrid)', () => {
  it('bàn dẫn tới màn gọi món và bàn Đang phục vụ có nút Khách đã dùng xong', async () => {
    api.list.mockResolvedValue(map)
    api.finish.mockResolvedValue({} as never)
    renderApp(<TablesPage />)

    expect(await screen.findByRole('link', { name: 'Gọi món bàn 1' })).toHaveAttribute(
      'href',
      '/service/tables/1',
    )
    expect(screen.getByRole('link', { name: 'Xem đơn bàn 9' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Chú thích trạng thái bàn')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Khách đã dùng xong' }))
    await waitFor(() => expect(api.finish).toHaveBeenCalled())
    expect(api.finish.mock.calls[0]![0]).toBe(20)
  })
})
