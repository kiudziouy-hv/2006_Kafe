import { screen, waitFor } from '@testing-library/react'
import { Route } from 'react-router-dom'
import { AxiosError, type AxiosResponse } from 'axios'
import { renderApp } from '@/test/renderWithProviders'
import type { SessionUser } from '@/types/api'
import { authApi } from '../api/authApi'
import { RequireRole } from './RequireRole'

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
const user = (role: SessionUser['role']): SessionUser => ({
  id: 9,
  fullName: 'x',
  role,
  home: '',
  autoLogoutSeconds: 0,
})

const routes = (
  <>
    <Route element={<RequireRole roles={['OWNER']} />}>
      <Route path="/admin" element={<span>khu quản lý</span>} />
    </Route>
    <Route element={<RequireRole roles={['BARISTA']} />}>
      <Route path="/kitchen" element={<span>khu pha chế</span>} />
    </Route>
    <Route path="/login" element={<span>đăng nhập</span>} />
  </>
)

describe('RequireRole', () => {
  it('chưa đăng nhập thì về /login', async () => {
    api.me.mockRejectedValue(
      new AxiosError('x', 'E', undefined, undefined, { status: 401, data: {} } as AxiosResponse),
    )
    renderApp(<span />, '/admin', routes)
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/login'))
  })

  it('Pha chế vào /admin bị đưa về /kitchen', async () => {
    api.me.mockResolvedValue(user('BARISTA'))
    renderApp(<span />, '/admin', routes)
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/kitchen'))
    expect(await screen.findByText('khu pha chế')).toBeInTheDocument()
  })

  it('Chủ quán kế thừa quyền: vào được /kitchen', async () => {
    api.me.mockResolvedValue(user('OWNER'))
    renderApp(<span />, '/kitchen', routes)
    expect(await screen.findByText('khu pha chế')).toBeInTheDocument()
  })
})
