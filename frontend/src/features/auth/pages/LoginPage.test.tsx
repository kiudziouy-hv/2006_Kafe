import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router-dom'
import { AxiosError, type AxiosResponse } from 'axios'
import { renderApp } from '@/test/renderWithProviders'
import type { SessionUser } from '@/types/api'
import { authApi } from '../api/authApi'
import LoginPage from './LoginPage'

vi.mock('../api/authApi', () => ({
  authApi: {
    me: vi.fn(),
    staff: vi.fn(),
    onDuty: vi.fn(),
    staffLogin: vi.fn(),
    ownerLogin: vi.fn(),
    logout: vi.fn(),
  },
}))

const api = vi.mocked(authApi)
const waiter: SessionUser = {
  id: 2,
  fullName: 'Nhân viên mẫu A',
  role: 'WAITER',
  home: 'S10',
  autoLogoutSeconds: 0,
}

function authError(status: number, data: object) {
  return new AxiosError('x', 'ERR', undefined, undefined, { status, data } as AxiosResponse)
}

beforeEach(() => {
  vi.resetAllMocks()
  api.me.mockRejectedValue(authError(401, { code: 'NO_SESSION' }))
  // Mỗi vai trò có một tài khoản dùng chung (station) và có thể có nhiều tài khoản cá nhân (chỉ dùng để chấm công).
  api.staff.mockResolvedValue([
    { id: 4, fullName: 'Võ Tấn Phát', role: 'WAITER', locked: false },
    { id: 5, fullName: 'Võ Thị Em', role: 'WAITER', locked: false },
    { id: 11, fullName: 'Điện thoại Phục vụ', role: 'WAITER', station: true, locked: false },
    { id: 7, fullName: 'Trần Thanh Huy', role: 'BARISTA', locked: false },
    { id: 10, fullName: 'Màn hình Pha chế', role: 'BARISTA', station: true, locked: false },
    { id: 2, fullName: 'Quầy Thu ngân', role: 'CASHIER', station: true, locked: false },
  ])
  api.onDuty.mockResolvedValue([])
})

const routes = <Route path="/service" element={<span>trang phục vụ</span>} />

describe('LoginPage', () => {
  it('Quản lý: báo lỗi khi bỏ trống, đăng nhập đúng thì vào /admin', async () => {
    api.ownerLogin.mockResolvedValue({
      ...waiter,
      id: 1,
      role: 'OWNER',
      fullName: 'Chủ quán mẫu',
      home: 'S54',
    })
    renderApp(<LoginPage />, '/login', <Route path="/admin" element={<span>trang quản lý</span>} />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Đăng nhập' }))
    expect(await screen.findByText('Nhập tên đăng nhập.')).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText('Tên đăng nhập...'), 'chuquan')
    await user.type(screen.getByPlaceholderText('Mật khẩu...'), 'Quan@2026')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/admin'))
    expect(api.ownerLogin).toHaveBeenCalledWith('chuquan', 'Quan@2026')
  })

  it('Nhân viên: chọn vai trò, nhập PIN 6 số rồi OK thì vào /service', async () => {
    api.staffLogin.mockResolvedValue(waiter)
    renderApp(<LoginPage />, '/login', routes)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('tab', { name: /Nhân viên/ }))
    await user.click(await screen.findByRole('radio', { name: 'Phục vụ' }))
    for (const k of '123456') await user.click(screen.getByRole('button', { name: k }))
    await user.click(screen.getByRole('button', { name: 'OK' }))
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/service'))
    expect(api.staffLogin).toHaveBeenCalledWith(11, '123456', undefined)
  })

  it('Nhân viên: không hiện danh sách tài khoản dù vai trò có nhiều người (chỉ chấm công mới chọn tên)', async () => {
    renderApp(<LoginPage />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('tab', { name: /Nhân viên/ }))
    await user.click(await screen.findByRole('radio', { name: 'Phục vụ' }))
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByText('Võ Tấn Phát')).not.toBeInTheDocument()
    expect(screen.queryByText(/dùng chung/i)).not.toBeInTheDocument()
  })

  it('Thu ngân: phải chọn tên người đang chấm công rồi mới đăng nhập, tên gửi kèm PIN', async () => {
    api.onDuty.mockResolvedValue([
      { id: 21, name: 'Lê Thu Hà' },
      { id: 22, name: 'Mai Anh' },
    ])
    api.staffLogin.mockResolvedValue({ ...waiter, role: 'CASHIER', home: 'S20' })
    renderApp(
      <LoginPage />,
      '/login',
      <Route path="/cashier" element={<span>trang thu ngân</span>} />,
    )
    const user = userEvent.setup()
    await user.click(await screen.findByRole('tab', { name: /Nhân viên/ }))
    await user.click(await screen.findByRole('radio', { name: 'Thu ngân' }))
    const pick = await screen.findByRole('combobox', { name: 'Tên nhân viên' })
    for (const k of '123456') await user.click(screen.getByRole('button', { name: k }))
    await user.click(screen.getByRole('button', { name: 'OK' }))
    expect(await screen.findByText('Chọn tên của bạn trước khi nhập PIN.')).toBeInTheDocument()
    expect(api.staffLogin).not.toHaveBeenCalled()
    await user.selectOptions(pick, 'Mai Anh')
    for (const k of '123456') await user.click(screen.getByRole('button', { name: k }))
    await user.click(screen.getByRole('button', { name: 'OK' }))
    await waitFor(() => expect(api.staffLogin).toHaveBeenCalledWith(2, '123456', 22))
  })

  it('Phục vụ: chọn tên người đang chấm công, tên gửi kèm PIN', async () => {
    api.onDuty.mockResolvedValue([{ id: 4, name: 'Võ Tấn Phát' }])
    api.staffLogin.mockResolvedValue(waiter)
    renderApp(<LoginPage />, '/login', routes)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('tab', { name: /Nhân viên/ }))
    await user.click(await screen.findByRole('radio', { name: 'Phục vụ' }))
    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Tên nhân viên' }),
      'Võ Tấn Phát',
    )
    for (const k of '123456') await user.click(screen.getByRole('button', { name: k }))
    await user.click(screen.getByRole('button', { name: 'OK' }))
    await waitFor(() => expect(api.staffLogin).toHaveBeenCalledWith(11, '123456', 4))
  })

  it('PIN thiếu số: không gọi API và báo lỗi', async () => {
    renderApp(<LoginPage />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('tab', { name: /Nhân viên/ }))
    await user.click(await screen.findByRole('radio', { name: 'Pha chế' }))
    await user.click(screen.getByRole('button', { name: '1' }))
    await user.click(screen.getByRole('button', { name: 'OK' }))
    expect(await screen.findByText('Mã PIN gồm đúng 6 chữ số.')).toBeInTheDocument()
    expect(api.staffLogin).not.toHaveBeenCalled()
  })

  it('sai PIN: hiện số lần còn lại và xóa ô PIN', async () => {
    api.staffLogin.mockRejectedValue(
      authError(401, { code: 'WRONG_SECRET', message: 'Mã PIN không đúng.', attemptsLeft: 4 }),
    )
    renderApp(<LoginPage />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('tab', { name: /Nhân viên/ }))
    await user.click(await screen.findByRole('radio', { name: 'Phục vụ' }))
    for (const k of '000000') await user.click(screen.getByRole('button', { name: k }))
    await user.click(screen.getByRole('button', { name: 'OK' }))
    expect(await screen.findByText('Mã PIN không đúng. Còn 4 lần thử.')).toBeInTheDocument()
  })

  it('tài khoản bị khóa: nói rõ thời gian chờ', async () => {
    api.staffLogin.mockRejectedValue(
      authError(423, {
        code: 'LOCKED',
        message: 'Tài khoản tạm khóa 15 phút do nhập sai nhiều lần.',
        lockSeconds: 900,
      }),
    )
    renderApp(<LoginPage />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('tab', { name: /Nhân viên/ }))
    await user.click(await screen.findByRole('radio', { name: 'Phục vụ' }))
    for (const k of '000000') await user.click(screen.getByRole('button', { name: k }))
    await user.click(screen.getByRole('button', { name: 'OK' }))
    expect(await screen.findByText(/Thử lại sau khoảng 15 phút/)).toBeInTheDocument()
  })
})
