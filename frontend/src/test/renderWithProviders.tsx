import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ToastProvider } from '@/components/feedback/Toaster'
import { AuthProvider } from '@/features/auth'

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}

/** Dựng ứng dụng thu nhỏ có Query, Router, Toast, Auth; `Where` hiện đường dẫn hiện tại để kiểm tra điều hướng. */
export function renderApp(ui: ReactElement, path = '/login', extraRoutes?: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <ToastProvider>
          <AuthProvider>
            <Where />
            <Routes>
              <Route path="/login" element={ui} />
              {extraRoutes}
              <Route path="*" element={<span>khác</span>} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
