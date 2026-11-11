import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Chip, TextField } from '../../components/ui'
import { money, useStore } from '../../store'
import CashierLayout, { Panel } from './CashierLayout'

// S28 — Chốt ca; S28b — ca tối còn đơn mở / bàn chưa Trống (UC-31 E3, ASM-46)
export default function CloseShift() {
  const navigate = useNavigate()
  const { shift, setShift, drafts, tables, toast } = useStore()
  const [counted, setCounted] = useState('3.640.000')

  const expected = shift.opening + shift.cashRevenue - shift.refunds
  const actual = Number(counted.replace(/\D/g, ''))
  const diff = actual - expected
  const evening = shift.name === 'Ca tối'
  const openTables = tables.filter((t) => t.status !== 'free')

  const checks = [
    evening
      ? { ok: openTables.length === 0, text: openTables.length ? `Ca tối: còn ${openTables.length} bàn chưa Trống (${openTables.map((t) => t.name).join(', ')}): xử lý xong mới chốt ca (ASM-46)` : 'Ca tối: không còn đơn mở, tất cả bàn đã Trống' }
      : { ok: true, text: 'Ca sáng: đơn tại quán còn mở và món đang pha được bàn giao sang ca tối, không chặn chốt ca' },
    { ok: drafts.length === 0, text: drafts.length ? `Còn ${drafts.length} đơn nháp chuyển khoản/QR: hãy xác nhận hoặc hủy trước khi chốt ca` : 'Không còn đơn nháp chuyển khoản/QR' },
  ]
  const canClose = checks.every((c) => c.ok)

  useEffect(() => {
    if (drafts.length) toast({ type: 'warning', title: `Còn ${drafts.length} đơn nháp` })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const close = () => {
    if (!canClose) return toast({ type: 'error', title: 'Không thể chốt ca', message: 'Còn mục chưa xử lý trong danh sách kiểm tra.' })
    toast({ type: 'success', title: 'Đã chốt ca', message: `${shift.name} · chênh lệch ${money(diff)}` })
    setShift({ ...shift, open: false, name: evening ? 'Ca sáng' : 'Ca tối' })
    navigate('/dang-xuat')
  }

  return (
    <CashierLayout title={`Chốt ca thu ngân · ${evening ? 'Ca tối' : 'Ca sáng'}`}>
      <div className="flex gap-2">
        <Chip label="Ca sáng" selected={!evening} onClick={() => setShift({ ...shift, name: 'Ca sáng' })} />
        <Chip label="Ca tối" selected={evening} onClick={() => setShift({ ...shift, name: 'Ca tối' })} />
      </div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <Panel title="Đối soát tiền mặt" className="flex-1">
          <div className="flex flex-col gap-1 text-sm">
            <Row label="Tiền mặt đầu ca" value={money(shift.opening)} />
            <Row label="+ Doanh thu tiền mặt trong ca" value={money(shift.cashRevenue)} />
            <Row label="− Hoàn tiền một phần (hóa đơn tiền mặt chưa hủy)" value={`−${money(shift.refunds)}`} />
            <div className="my-2 h-px bg-border-strong" />
            <div className="flex items-center justify-between py-1">
              <span className="text-base font-semibold">Tiền mặt dự kiến</span>
              <span className="text-xl font-semibold">{money(expected)}</span>
            </div>
            <TextField
              label="Tiền mặt kiểm đếm thực tế (đ)"
              inputMode="numeric"
              value={counted}
              hint="Hóa đơn tiền mặt đã hủy không tính vào tiền dự kiến."
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, '')
                setCounted(d ? Number(d).toLocaleString('vi-VN') : '')
              }}
            />
            <div className="my-2 h-px bg-border-strong" />
            <div className="flex items-center justify-between py-1">
              <span className="text-base font-semibold">Chênh lệch (thực tế − dự kiến)</span>
              <span className={`text-xl font-semibold ${diff < 0 ? 'text-action-destructive' : ''}`}>{money(diff)}</span>
            </div>
          </div>
        </Panel>
        <Panel title="Kiểm tra trước khi chốt" className="flex-1 lg:min-h-[290px]">
          <ul className="flex flex-1 flex-col gap-3 text-sm">
            {checks.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className={c.ok ? 'text-text-primary' : 'text-action-destructive'}>{c.ok ? '✓' : '✗'}</span>
                {c.text}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-3">
            <Button variant="secondary" onClick={() => navigate('/thu-ngan/don-nhap')}>
              Mở danh sách đơn nháp
            </Button>
            <Button disabled={!canClose} onClick={close}>
              Xác nhận chốt ca
            </Button>
          </div>
        </Panel>
      </div>
    </CashierLayout>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-2">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
