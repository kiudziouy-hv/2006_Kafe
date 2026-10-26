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
  api.staff.mockResolvedValue([
    { id: 2, fullName: 'Nhân viên mẫu A', role: 'WAITER', locked: false },
    { id: 4, fullName: 'Nhân viên mẫu C', role: 'BARISTA', locked: false },
  ])
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
    expect(api.staffLogin).toHaveBeenCalledWith(2, '123456')
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
