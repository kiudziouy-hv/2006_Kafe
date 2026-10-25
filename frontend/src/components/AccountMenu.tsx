import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from './ui'
import iconUser from '../assets/icons/menu-user.svg'
import iconLogout from '../assets/icons/logout.svg'

type Props = { name: string; role: string; initials: string; profilePath?: string }

// Account Menu (Figma 48:375) — S03a/S03b/S03c/S54b
export default function AccountMenu({ name, role, initials, profilePath = '/ho-so' }: Props) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <Avatar initials={initials} size="sm" onClick={() => setOpen(!open)} />
      {open && <AccountMenuPanel name={name} role={role} initials={initials} onProfile={() => navigate(profilePath)} onLogout={() => navigate('/dang-xuat')} />}
    </div>
  )
}

type PanelProps = { name: string; role: string; initials: string; onProfile: () => void; onLogout: () => void; className?: string }

export function AccountMenuPanel({ name, role, initials, onProfile, onLogout, className = 'absolute top-10 -right-12 z-40 w-[240px]' }: PanelProps) {
  return (
    <div className={`flex origin-top-right animate-pop-in flex-col gap-0.5 rounded-xl border border-glass-stroke bg-[#f3ece0]/95 p-2 drop-shadow-[0_16px_20px_rgba(58,36,16,0.28)] backdrop-blur-lg ${className}`}>
      <div className="flex items-center gap-3 p-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-muted text-xs font-semibold">{initials}</div>
        <div>
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-[11px] text-text-secondary">{role}</p>
        </div>
      </div>
      <div className="h-px bg-border-default" />
      <MenuItem icon={iconUser} label="Hồ sơ cá nhân" onClick={onProfile} />
      <MenuItem icon={iconLogout} label="Đăng xuất" onClick={onLogout} />
    </div>
  )
}

function MenuItem({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-md p-3 text-left text-sm hover:bg-white/60">
      <img src={icon} alt="" className="size-[18px]" />
      {label}
    </button>
  )
}
