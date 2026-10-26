import { z } from 'zod'

export const ownerLoginSchema = z.object({
  username: z.string().trim().min(1, 'Nhập tên đăng nhập.'),
  password: z.string().min(1, 'Nhập mật khẩu.'),
})
export type OwnerLoginForm = z.infer<typeof ownerLoginSchema>

/** PIN nhân viên gồm đúng 6 chữ số (UC-01). */
export const pinSchema = z.string().regex(/^\d{6}$/, 'Mã PIN gồm đúng 6 chữ số.')
