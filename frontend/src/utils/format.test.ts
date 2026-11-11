import { formatClock, formatMoney, formatDate, orderLabel, todayIso } from './format'

describe('format', () => {
  it('định dạng tiền Việt', () => {
    expect(formatMoney(76000)).toBe('76.000đ')
    expect(formatMoney(0)).toBe('0đ')
  })

  it('giờ phút không hợp lệ trả --:--', () => {
    expect(formatClock('không phải ngày')).toBe('--:--')
  })
})

describe('định dạng ngày và nhãn đơn', () => {
  it('đổi yyyy-MM-dd sang dd/MM/yyyy', () => {
    expect(formatDate('2026-10-25')).toBe('25/10/2026')
    expect(formatDate(null)).toBe('—')
  })

  it('todayIso có dạng yyyy-MM-dd và lùi đúng số ngày', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(todayIso(-1) < todayIso()).toBe(true)
  })

  it('nhãn đơn: bàn hoặc số thứ tự mang đi', () => {
    expect(orderLabel({ orderType: 'DINE_IN', tableNo: 3, queueNumber: null })).toBe('Bàn 3')
    expect(orderLabel({ orderType: 'TAKEAWAY', tableNo: null, queueNumber: 7 })).toBe('#007')
  })
})
