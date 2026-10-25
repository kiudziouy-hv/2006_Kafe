import { useRef, useState } from 'react'
import { Button } from './ui'
import iconCup from '../assets/icons/cup-lg.svg'

// Ảnh minh họa món / topping (chỉ xem trước trên trình duyệt, chưa tải lên máy chủ)
export default function ImagePicker({ label }: { label: string }) {
  const ref = useRef<HTMLInputElement>(null)
  const [src, setSrc] = useState<string | null>(null)
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border-default bg-bg-muted">
        {src ? <img src={src} alt="" className="size-full object-cover" /> : <img src={iconCup} alt="" className="size-[43px]" />}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">{label}</p>
        <div>
          <Button variant="secondary" onClick={() => ref.current?.click()}>
            Tải ảnh lên
          </Button>
        </div>
        <p className="text-[11px] text-text-secondary">Ảnh vuông 1:1, JPG/PNG. Chỉ để minh họa.</p>
        <input
          ref={ref}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) setSrc(URL.createObjectURL(f))
          }}
        />
      </div>
    </div>
  )
}
