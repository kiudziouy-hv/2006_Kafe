import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import Badge from './Badge'
import cafePhoto from '../assets/cafe-header.jpg'
import iconUserMuted from '../assets/icons/user-muted.svg'
import iconUserDark from '../assets/icons/user-dark.svg'

// Khung chung cho S01 / S02: điện thoại có ảnh quán ở đầu trang,
// màn hình ngang (lg) là thẻ lớn với ảnh quán bên trái.
export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen lg:flex lg:items-center lg:justify-center lg:p-10">
      {/* Ảnh quán — điện thoại */}
      <div className="absolute inset-x-0 top-0 h-[230px] lg:hidden">
        <img src={cafePhoto} alt="" className="size-full object-cover" />
        <div className="absolute inset-x-0 top-20 -bottom-px bg-gradient-to-b from-cream-fade/0 via-cream-fade/85 via-60% to-cream-fade" />
      </div>

      <div className="relative lg:flex lg:h-[820px] lg:w-full lg:max-w-[1360px] lg:overflow-hidden lg:rounded-[48px] lg:border-[1.5px] lg:border-gold-frame lg:bg-[linear-gradient(149deg,#f9efd8_0%,#f1e1b8_71%)] lg:shadow-[0_28px_60px_-8px_rgba(90,58,20,0.28)]">
        {/* Ảnh quán — màn hình ngang */}
        <div className="relative hidden w-[660px] shrink-0 lg:block">
          <img src={cafePhoto} alt="" className="size-full object-cover" />
          <div className="absolute inset-y-0 right-0 w-[360px] bg-gradient-to-r from-[#f6e9cc]/0 via-[#f6e9cc]/82 via-55% to-[#f6e9cc]" />
        </div>

        <div className="flex flex-col items-center gap-3 px-5 pt-28 pb-4 lg:flex-1 lg:justify-center lg:gap-3.5 lg:p-0">
          <div className="flex flex-col items-center gap-2">
            <p className="hidden text-[13px] font-semibold tracking-[2.08px] text-ink-label lg:block">CHÀO MỪNG BẠN ĐẾN VỚI</p>
            <Badge />
            <p className="text-xs font-semibold tracking-[1.92px] text-ink-label lg:hidden">CHÀO MỪNG BẠN ĐẾN VỚI</p>
            <p className="text-[13px] font-semibold whitespace-pre text-gold lg:text-sm">{'✦   ❖   ✦'}</p>
          </div>

          <nav className="flex w-full max-w-[350px] lg:max-w-[540px]">
            <LoginTab to="/dang-nhap/quan-ly" label="Quản lý" />
            <LoginTab to="/dang-nhap" label="Nhân viên" end />
          </nav>

          <div className="w-full max-w-[350px] animate-page-in lg:max-w-[540px]">{children}</div>
        </div>
      </div>
    </div>
  )
}

function LoginTab({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex h-11 flex-1 items-center justify-center gap-2 px-5 text-lg font-semibold lg:h-12 lg:gap-2.5 lg:text-xl ${
          isActive ? 'border-b-3 border-gold-tab text-ink' : 'border-b-2 border-gold-tab-idle text-ink-muted'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <img src={isActive ? iconUserDark : iconUserMuted} alt="" className="size-5" />
          {label}
        </>
      )}
    </NavLink>
  )
}

export function LoginTitle({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-1.5 lg:pt-1">
      <h1 className="text-center text-[22px] leading-6 font-semibold tracking-[0.44px] text-ink lg:text-2xl lg:tracking-[0.48px]">{children}</h1>
      <span className="h-[3px] w-[200px] rounded-[2px] bg-gradient-to-r from-gold-line to-gold-line/0 lg:w-[240px]" />
    </div>
  )
}
