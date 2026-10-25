import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppHeader, Button, ConfirmDialog } from '../components/ui'

// S04 / S04b–d — Đăng xuất; S04e–f — Phiên đã hết hạn (?ly-do=het-han)
export default function Logout() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const expired = params.get('ly-do') === 'het-han'
  const toLogin = () => navigate('/dang-nhap', { replace: true })

  return (
    <div className="flex min-h-screen flex-col gap-3 bg-bg-canvas p-3">
      <div className="lg:hidden">
        <AppHeader title="Phiên đăng nhập" />
      </div>
      <div className="flex flex-1 animate-pop-in items-center justify-center p-4">
        {expired ? (
          <ConfirmDialog title="Phiên đã hết hạn" message="Không thao tác 5 phút. Hãy đăng nhập lại để tiếp tục." className="lg:w-[460px]">
            <Button onClick={toLogin}>Đăng nhập lại</Button>
          </ConfirmDialog>
        ) : (
          <ConfirmDialog
            title="Đăng xuất?"
            message="Bạn sẽ quay về màn hình đăng nhập. Phiên ca thu ngân đang mở (nếu có) không bị đóng."
            className="lg:w-[460px]"
          >
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Ở lại
            </Button>
            <Button onClick={toLogin}>Đăng xuất</Button>
          </ConfirmDialog>
        )}
      </div>
    </div>
  )
}
