import { useState } from 'react'
import { Panel, RowMenu, SearchBox, Table } from '../../components/Table'
import { Badge, Button, ConfirmDialog, DialogOverlay, Modal, Select, TextField, DateField } from '../../components/ui'
import { useStore, type Promo } from '../../store'
import OwnerLayout from './OwnerLayout'

const GROUPS = ['Coffee', 'Tea', 'Smoothie', 'Cake', 'Coffee / Tea / Smoothie / Cake']
const fmt = (s?: string) => (s ? s.split('-').reverse().slice(0, 2).join('/') : '')

// S51 — Khuyến mãi; S51b — Tạo; S51c/e — menu ⋯ (đang bật / đã tắt); S51d — Sửa
export default function Promotions() {
  const { promos, savePromo, removePromo, toast } = useStore()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Promo | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Promo | null>(null)
  const rows = promos.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <OwnerLayout title="Chương trình khuyến mãi">
      <Panel title="Danh sách chương trình">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <SearchBox value={q} onChange={setQ} />
          </div>
          <Button onClick={() => setEditing('new')}>+ Tạo chương trình</Button>
        </div>
        <Table
          rows={rows}
          rowKey={(r) => r.id}
          empty={q ? `Không tìm thấy chương trình khớp «${q}».` : 'Chưa có chương trình khuyến mãi.'}
          cols={[
            { head: 'Chương trình', cell: (r) => r.name },
            { head: 'Nhóm món', cell: (r) => r.group },
            { head: 'Giảm', cell: (r) => `${r.percent}%`, className: 'text-right' },
            { head: 'Ngày áp dụng', cell: (r) => (r.from ? `${fmt(r.from)} – ${fmt(r.to)}` : 'Không giới hạn') },
            { head: 'Khung giờ', cell: (r) => (r.startTime ? `${r.startTime} – ${r.endTime}` : 'Cả ngày') },
            { head: 'Trạng thái', cell: (r) => (r.active ? <Badge label="Đang bật" tone="success" /> : <Badge label="Đã tắt" />) },
            {
              head: 'Thao tác',
              cell: (r) => (
                <RowMenu
                  actions={[
                    { label: 'Sửa', onClick: () => setEditing(r) },
                    {
                      label: r.active ? 'Tắt chương trình' : 'Bật lại chương trình',
                      onClick: () => {
                        savePromo({ ...r, active: !r.active })
                        toast({ type: 'success', title: 'Đã cập nhật chương trình', message: `${r.name} ${r.active ? 'đã tắt' : 'đã bật'}.` })
                      },
                    },
                    { label: r.used ? 'Xóa (đã áp dụng, không thể xóa)' : 'Xóa (chưa từng áp dụng)', danger: true, disabled: r.used, onClick: () => setDeleting(r) },
                  ]}
                />
              ),
            },
          ]}
        />
      </Panel>

      {editing && (
        <PromoForm
          promo={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(p) => {
            savePromo(p)
            toast({ type: 'success', title: editing === 'new' ? 'Đã lưu chương trình' : 'Đã cập nhật chương trình', message: p.name })
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <DialogOverlay onClose={() => setDeleting(null)}>
          <ConfirmDialog title={`Xóa ${deleting.name}?`} message="Chương trình chưa từng áp dụng cho hóa đơn nào sẽ bị xóa vĩnh viễn.">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Không
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                removePromo(deleting.id)
                toast({ type: 'success', title: 'Đã xóa chương trình', message: deleting.name })
                setDeleting(null)
              }}
            >
              Xóa
            </Button>
          </ConfirmDialog>
        </DialogOverlay>
      )}
    </OwnerLayout>
  )
}

function PromoForm({ promo, onClose, onSave }: { promo: Promo | null; onClose: () => void; onSave: (p: Promo) => void }) {
  const { toast } = useStore()
  const [f, setF] = useState({
    name: promo?.name ?? '',
    group: promo?.group ?? GROUPS[4],
    percent: String(promo?.percent ?? 20),
    from: promo?.from ?? '',
    to: promo?.to ?? '',
    startTime: promo?.startTime ?? '14:00',
    endTime: promo?.endTime ?? '16:00',
  })
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v })

  const save = () => {
    const pct = Number(f.percent)
    const err = !f.name.trim()
      ? 'Nhập tên chương trình.'
      : !(pct >= 1 && pct <= 50)
        ? 'Mức giảm phải từ 1% đến 50%.'
        : f.from && f.to && f.from > f.to
          ? 'Ngày bắt đầu phải trước ngày kết thúc.'
          : f.startTime >= f.endTime
            ? 'Giờ bắt đầu phải trước giờ kết thúc.'
            : ''
    if (err) return toast({ type: 'error', title: 'Không thể lưu khuyến mãi', message: err })
    onSave({
      id: promo?.id ?? `p${Date.now()}`,
      name: f.name.trim(),
      group: f.group,
      percent: pct,
      from: f.from || undefined,
      to: f.to || undefined,
      startTime: f.startTime,
      endTime: f.endTime,
      active: promo?.active ?? true,
      used: promo?.used ?? false,
    })
  }

  return (
    <Modal title={promo ? 'Sửa chương trình khuyến mãi' : 'Tạo chương trình khuyến mãi'} onClose={onClose}>
      <TextField label="Tên chương trình" placeholder="Nhập nội dung..." value={f.name} onChange={(e) => set('name')(e.target.value)} />
      <Select label="Nhóm món áp dụng" value={f.group} onChange={set('group')} options={GROUPS} />
      <TextField label="Mức giảm (%)" inputMode="numeric" value={f.percent} hint="Từ 1% đến 50%." onChange={(e) => set('percent')(e.target.value.replace(/\D/g, ''))} />
      <div className="flex gap-3">
        <DateField label="Từ ngày (tùy chọn)" value={f.from} onChange={set('from')} />
        <DateField label="Đến ngày (tùy chọn)" value={f.to} onChange={set('to')} />
      </div>
      <div className="flex gap-3">
        <TextField label="Từ giờ (lặp mỗi ngày)" type="time" value={f.startTime} onChange={(e) => set('startTime')(e.target.value)} />
        <TextField label="Đến giờ" type="time" value={f.endTime} onChange={(e) => set('endTime')(e.target.value)} />
      </div>
      <div className="flex gap-2 [&>*]:flex-1">
        <Button variant="destructive-text" onClick={onClose}>
          Hủy
        </Button>
        <Button onClick={save}>{promo ? 'Lưu thay đổi' : 'Lưu và kích hoạt'}</Button>
      </div>
    </Modal>
  )
}
