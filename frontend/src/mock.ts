// Dữ liệu giả để chạy thử giao diện khi chưa có backend.
export const MOCK_STAFF_PIN: Record<string, string> = {
  'phuc-vu': '111111',
  'pha-che': '222222',
  'thu-ngan': '333333',
}

export const MOCK_MANAGER = { username: 'quanly', password: '123456' }

// BR-042: nhập sai PIN 5 lần liên tiếp thì khóa 15 phút
export const MAX_PIN_ATTEMPTS = 5
export const LOCK_SECONDS = 15 * 60

export const MOCK_PROFILE = {
  name: 'Nhân viên mẫu A',
  initials: 'VP',
  role: 'Phục vụ',
  phone: '0912345678',
  email: 'mau@vidu.vn',
  pin: '111111',
}

export const MOCK_STAFF = [
  { id: 'nv-a', name: 'Nhân viên mẫu A', pin: '111111' },
  { id: 'nv-b', name: 'Nhân viên mẫu B', pin: '222222' },
  { id: 'nv-c', name: 'Nhân viên mẫu C', pin: '333333' },
]

export const MOCK_SHIFTS = ['Ca sáng (07:00 – 14:30)', 'Ca chiều (14:30 – 22:00)']
