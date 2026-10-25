import badge from '../assets/badge.png'

// Huy hiệu 2006 Kafé (logo). Thay src/assets/badge.png khi có logo chính thức.
// Ảnh 152px có bóng đổ tràn ra ngoài khung 112px, giống Figma.
export default function Badge() {
  return (
    <div className="relative size-28 shrink-0">
      <img src={badge} alt="2006 Kafé" width={152} height={152} className="absolute -top-2 -left-5 max-w-none size-38" />
    </div>
  )
}
