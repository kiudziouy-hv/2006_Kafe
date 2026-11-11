import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReceiptDialog from '../../components/Receipt'
import { Badge, Button, Chip, DialogOverlay, IconButton, TextField } from '../../components/ui'
import { money, nowHM, useStore, type Invoice, type Member, type PayMethod } from '../../store'
import CashierLayout, { DataTable, Panel } from './CashierLayout'
import { takeawayCart } from './Takeaway'
import iconCup from '../../assets/icons/cup-lg.svg'
import iconCash from '../../assets/icons/pay-cash.svg'
import iconReceipt from '../../assets/icons/receipt.svg'
import iconCheck from '../../assets/icons/check-circle.svg'
import iconClose from '../../assets/icons/close.svg'

type Line = { qty: number; name: string; options: string; price: number }

// BR-023: điểm dùng tối đa 30% giá trị sau khuyến mãi; 1 điểm = 1.000đ; tích 1 điểm / 10.000đ
const POINT_VALUE = 1000

// S23 — Thanh toán bàn; S23b — đơn mang đi; S23c — vượt giới hạn điểm; S24/S25/S27 popup
export default function Payment() {
  const { id } = useParams()
  const takeaway = id === 'mang-di'
  const tableId = Number(id)
  const navigate = useNavigate()
  const { tables, orders, clearTable, addInvoice, addDraft, members, addMember, invoices, toast } = useStore()
  const table = tables.find((t) => t.id === tableId)

  const lines: Line[] = useMemo(
    () =>
      takeaway
        ? takeawayCart.items.map((c) => ({ qty: c.qty, name: c.item.name, options: c.options, price: c.unitPrice }))
        : (orders[tableId] ?? []).filter((l) => l.status !== 'cancelled').map((l) => ({ qty: l.qty, name: l.name, options: l.options || 'Phần', price: l.price })),
    [takeaway, orders, tableId],
  )

  const [method, setMethod] = useState<PayMethod>(takeaway ? takeawayCart.method : 'cash')
  const [phone, setPhone] = useState('')
  const [member, setMember] = useState<Member | null>(null)
  const [points, setPoints] = useState(0)
  const [dialog, setDialog] = useState<'lookup' | 'register' | 'receipt' | null>(null)
  const [paid, setPaid] = useState<Invoice | null>(null)

  const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0)
  const discount = subtotal >= 100000 ? 4000 : 0
  const maxPoints = Math.floor(((subtotal - discount) * 0.3) / POINT_VALUE)
  const usable = member ? Math.min(member.points, maxPoints) : 0
  const total = subtotal - discount - points * POINT_VALUE
  const earn = Math.floor(total / 10000)
  const count = lines.reduce((s, l) => s + l.qty, 0)

  useEffect(() => {
    if (lines.length) toast({ type: 'info', title: 'Sẵn sàng thanh toán · Đơn đã xong' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!takeaway && !table) return <CashierLayout title="Thanh toán">Không tìm thấy bàn.</CashierLayout>

  const setPointsChecked = (v: number) => {
    if (v > maxPoints) {
      toast({ type: 'error', title: 'Vượt giới hạn điểm', message: `Tối đa ${maxPoints} điểm cho đơn này (30% giá trị sau khuyến mãi).` })
      setPoints(usable)
      return
    }
    if (member && v > member.points) {
      toast({ type: 'error', title: 'Không đủ điểm', message: `Khách chỉ có ${member.points} điểm.` })
      setPoints(member.points)
      return
    }
    setPoints(Math.max(0, v))
  }

  const pay = () => {
    if (method === 'transfer') {
      addDraft({ id: `#${String(Date.now()).slice(-3)}`, createdAt: nowHM(), items: lines.map((l) => `${l.qty}× ${l.name}`).join('; '), amount: total, points: points || undefined })
      toast({ type: 'info', title: 'Đã tạo đơn nháp chuyển khoản/QR', message: 'Xác nhận khi đã nhận đủ tiền ở tab Đơn nháp.' })
      if (!takeaway) clearTable(tableId)
      else takeawayCart.items = []
      navigate('/thu-ngan/don-nhap')
      return
    }
    const inv: Invoice = {
      id: `HĐ mẫu ${invoices.length + 1}`,
      time: nowHM(),
      kind: takeaway ? `Mang đi #${String(invoices.length + 4).padStart(3, '0')}` : `Tại quán · ${table!.name}`,
      method,
      total,
      discount,
      pointsUsed: points,
      pointsEarned: earn,
      lines: lines.map((l) => ({ qty: l.qty, name: `${l.name}${l.options && l.options !== 'Phần' ? ` (${l.options})` : ''}`, amount: l.qty * l.price })),
    }
    addInvoice(inv)
    setPaid(inv)
    setDialog('receipt')
    toast({ type: 'success', title: 'Thanh toán thành công', message: `${money(total)} · Tiền mặt` })
  }

  const finish = () => {
    if (!takeaway) clearTable(tableId)
    else takeawayCart.items = []
    navigate(takeaway ? '/thu-ngan/mang-di' : '/thu-ngan')
  }

  return (
    <CashierLayout title="Thanh toán" tabs={false}>
      <div className="flex items-center px-2">
        <p className="flex-1 text-sm text-text-secondary">
          {takeaway ? `Đơn mang đi · ${lines.length} sản phẩm · Tiền mặt hoặc chuyển khoản/QR` : `Đơn #S23 · ${table!.name} · ${lines.length} sản phẩm`}
        </p>
        <Badge label={takeaway ? 'Chờ xác nhận' : 'Chờ thanh toán'} tone="success" />
      </div>
      <div className="flex flex-1 flex-col gap-4 lg:flex-row">
        <Panel title="Chi tiết đơn hàng" className={`flex-1 ${takeaway ? 'self-start lg:w-auto' : ''}`}>
          <div className="flex flex-1 flex-wrap content-start gap-3 pt-2">
            {lines.map((l, i) => (
              <div key={i} className="flex w-full flex-col gap-2 rounded-[14px] border border-border-default bg-white/60 p-2.5 sm:w-[229px]">
                <div className="flex h-[110px] items-center justify-center rounded-md border border-border-default bg-bg-muted">
                  <img src={iconCup} alt="" className="size-[43px]" />
                </div>
                <p className="text-base font-semibold">{l.name}</p>
                <p className="text-xs text-text-secondary">{l.options}</p>
                <p className="text-sm font-semibold">
                  {l.qty} × {money(l.price)}
                </p>
              </div>
            ))}
          </div>
          <div className="flex py-2.5 text-sm">
            <span className="flex-1 text-text-secondary">Tổng số lượng</span>
            <span className="font-semibold">{count} món</span>
          </div>
        </Panel>

        <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[462px]">
          <Panel title="Tổng thanh toán">
            <div className="flex flex-col gap-2">
              <Sum label="Tạm tính" value={money(subtotal)} />
              <Sum label="Khuyến mãi" value={`−${money(discount)}`} green />
              <Sum label="Điểm sử dụng" value={`−${money(points * POINT_VALUE)}`} green />
              <div className="h-px bg-border-strong" />
              <p className="text-[11px] text-text-secondary">KHÁCH PHẢI TRẢ</p>
              <p className="text-2xl leading-8 font-bold">{money(total)}</p>
              <p className="text-sm font-semibold">Phương thức</p>
              <Method icon={iconCash} label="Tiền mặt" active={method === 'cash'} onClick={() => setMethod('cash')} />
              <Method icon={iconReceipt} label="Chuyển khoản / QR" active={method === 'transfer'} onClick={() => setMethod('transfer')} />
              <div className="rounded-xl bg-info-bg px-3.5 py-2">
                <p className="text-sm font-semibold">Điểm tích lũy mới</p>
                <p className="text-xs text-text-secondary">{member ? `Dự kiến +${earn} điểm` : 'Gắn thành viên để tích điểm'}</p>
              </div>
            </div>
          </Panel>
          <Panel>
            <div className="flex flex-col gap-1.5">
              <TextField
                label="Khách hàng (tùy chọn) · Số điện thoại"
                placeholder="09xxxxxxxx"
                inputMode="tel"
                value={member ? member.phone : phone}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 10)
                  setPhone(v)
                  setMember(null)
                  setPoints(0)
                  // Nhập đủ 10 số thì mở Tra cứu thành viên (S24)
                  if (v.length === 10) setDialog('lookup')
                }}
                onKeyDown={(e) => e.key === 'Enter' && setDialog('lookup')}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-text-secondary">
                  Khả dụng: {member?.points ?? 0} · Tối đa: {member ? maxPoints : 0} điểm{method === 'transfer' ? ' · QR: chỉ trừ khi đã nhận tiền' : ''}
                </span>
                <label className="flex items-center gap-1 font-semibold">
                  Sử dụng:
                  <input
                    type="number"
                    min={0}
                    disabled={!member}
                    value={points}
                    onChange={(e) => setPointsChecked(Number(e.target.value))}
                    className="w-12 rounded-md border border-transparent bg-transparent px-1 text-right font-semibold hover:border-border-default focus:border-border-default disabled:text-text-primary"
                  />
                  điểm
                </label>
              </div>
            </div>
          </Panel>
          <div className="flex-1" />
          <div className="flex gap-3 [&>*]:flex-1">
            <Button variant="destructive-text" onClick={() => navigate(-1)}>
              Hủy
            </Button>
            <Button disabled={lines.length === 0} onClick={pay}>
              Xác nhận thanh toán
            </Button>
          </div>
        </div>
      </div>

      {dialog === 'lookup' && (
        <MemberLookup
          initialPhone={phone}
          onClose={() => setDialog(null)}
          onRegister={() => setDialog('register')}
          onAttach={(m) => {
            setMember(m)
            setPoints(Math.min(10, Math.min(m.points, maxPoints)))
            setDialog(null)
            toast({ type: 'success', title: 'Đã gắn thành viên', message: `${m.name} · ${m.points} điểm` })
          }}
        />
      )}
      {dialog === 'register' && (
        <RegisterMember
          initialPhone={phone}
          onClose={() => setDialog(null)}
          onDone={(m) => {
            if (!/^0\d{9}$/.test(m.phone) || members.some((x) => x.phone === m.phone)) {
              toast({ type: 'error', title: 'Không thể đăng ký', message: 'Số điện thoại không hợp lệ hoặc đã tồn tại.' })
              return
            }
            addMember(m)
            setMember(m)
            setDialog(null)
            toast({ type: 'success', title: 'Đã đăng ký thành viên', message: `${m.name || 'Khách mới'} · ${m.phone}` })
          }}
        />
      )}
      {dialog === 'receipt' && paid && (
        <ReceiptDialog
          invoice={paid}
          onClose={finish}
          onPrint={() => {
            toast({ type: 'success', title: 'In hóa đơn thành công', message: paid.id })
            finish()
          }}
        />
      )}
    </CashierLayout>
  )
}

function Sum({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="flex text-sm">
      <span className="flex-1 text-text-secondary">{label}</span>
      <span className={`font-semibold ${green ? 'text-badge-success-fg' : ''}`}>{value}</span>
    </div>
  )
}

function Method({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold ${
        active ? 'border-2 border-action-primary bg-white/85' : 'border border-border-default bg-white/45'
      }`}
    >
      <img src={icon} alt="" className="size-5" />
      <span className="flex-1">{label}</span>
      {active && <img src={iconCheck} alt="" className="size-5" />}
    </button>
  )
}

const HISTORY = [
  { date: '20/10 10:50', type: 'Tích', tone: 'success' as const, points: '+13', invoice: 'HĐ mẫu 1' },
  { date: '20/10 10:50', type: 'Dùng', tone: 'success' as const, points: '−10', invoice: 'HĐ mẫu 1' },
  { date: '19/10 18:10', type: 'Hoàn', tone: 'neutral' as const, points: '+4', invoice: 'HĐ mẫu 2' },
  { date: '19/10 18:10', type: 'Thu hồi', tone: 'warning' as const, points: '−9', invoice: 'HĐ mẫu 2 (hủy)' },
]

// S24 — Tra cứu thành viên
function MemberLookup({ initialPhone, onClose, onRegister, onAttach }: { initialPhone: string; onClose: () => void; onRegister: () => void; onAttach: (m: Member) => void }) {
  const { members, toast } = useStore()
  const [phone, setPhone] = useState(initialPhone || '0912345678')
  const [found, setFound] = useState<Member | null>(null)
  const [tab, setTab] = useState<'points' | 'tx'>('points')

  const search = () => {
    const m = members.find((x) => x.phone === phone.trim())
    setFound(m ?? null)
    if (!m) toast({ type: 'warning', title: 'Không tìm thấy số điện thoại', message: 'Đăng ký thành viên mới để tích điểm.' })
  }

  return (
    <DialogOverlay onClose={onClose}>
      <div className="flex max-h-[90vh] flex-col gap-4 overflow-y-auto rounded-[28px] border border-glass-stroke bg-[#f5eee2] p-6 shadow-[0_20px_48px_-8px_rgba(47,24,5,0.28)]">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Tra cứu thành viên</h2>
          <IconButton icon={iconClose} label="Đóng" size="sm" onClick={onClose} />
        </div>
        <div className="flex items-end gap-2 px-4">
          <div className="flex-1">
            <TextField label="Số điện thoại (10 số, bắt đầu 0)" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
          </div>
          <Button onClick={search}>Tìm</Button>
        </div>
        {found && (
          <div className="mx-4 flex flex-col gap-3">
            <div className="rounded-xl border border-border-default bg-bg-surface p-3">
              <p className="text-base font-semibold">
                {found.name} · {found.phone}
              </p>
              <p className="text-xs text-text-secondary">Điểm hiện tại: {found.points}</p>
            </div>
            <div className="flex gap-2">
              <Chip label="Lịch sử điểm" selected={tab === 'points'} onClick={() => setTab('points')} />
              <Chip label="Lịch sử giao dịch" selected={tab === 'tx'} onClick={() => setTab('tx')} />
            </div>
            <DataTable head={tab === 'points' ? ['Ngày', 'Loại', 'Điểm', 'Hóa đơn'] : ['Ngày', 'Hóa đơn', 'Số tiền', 'Phương thức']}>
              {tab === 'points'
                ? HISTORY.map((h, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3">{h.date}</td>
                      <td className="px-4 py-3"><Badge label={h.type} tone={h.tone} /></td>
                      <td className="px-4 py-3 text-right">{h.points}</td>
                      <td className="px-4 py-3">{h.invoice}</td>
                    </tr>
                  ))
                : [['20/10 10:50', 'HĐ mẫu 1', '137.000đ', 'Tiền mặt'], ['19/10 18:10', 'HĐ mẫu 2', '85.000đ', 'Chuyển khoản/QR']].map((r, i) => (
                    <tr key={i}>
                      {r.map((c, j) => (
                        <td key={j} className="px-4 py-3">{c}</td>
                      ))}
                    </tr>
                  ))}
            </DataTable>
          </div>
        )}
        <div className="flex gap-2 px-4 [&>*]:flex-1">
          <Button variant="secondary" onClick={onRegister}>
            Đăng ký thành viên mới
          </Button>
          <Button disabled={!found} onClick={() => found && onAttach(found)}>
            Gắn vào đơn đang thanh toán
          </Button>
        </div>
      </div>
    </DialogOverlay>
  )
}

// S25 — Đăng ký thành viên
function RegisterMember({ initialPhone, onClose, onDone }: { initialPhone: string; onClose: () => void; onDone: (m: Member) => void }) {
  const [phone, setPhone] = useState(initialPhone)
  const [name, setName] = useState('')
  return (
    <DialogOverlay onClose={onClose}>
      <div className="flex flex-col gap-4 rounded-[28px] border border-glass-stroke bg-[#f5eee2] p-6 shadow-[0_20px_48px_-8px_rgba(47,24,5,0.28)]">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Đăng ký thành viên</h2>
          <IconButton icon={iconClose} label="Đóng" size="sm" onClick={onClose} />
        </div>
        <div className="flex flex-col gap-4 px-4">
          <TextField label="Số điện thoại" placeholder="09xxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <TextField label="Họ tên khách hàng" placeholder="Nhập nội dung..." value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex gap-2 px-4 pt-2 [&>*]:flex-1">
          <Button variant="destructive-text" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={() => onDone({ phone: phone.trim(), name: name.trim() || 'Khách mới', points: 0 })}>Đăng ký</Button>
        </div>
      </div>
    </DialogOverlay>
  )
}
