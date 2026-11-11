import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DataTable } from './DataTable'

describe('DataTable', () => {
  it('hiển thị các dòng và cho phép nhiều cột không tiêu đề', () => {
    render(
      <DataTable
        rows={[{ id: 1, name: 'Cà phê sữa' }]}
        rowKey={(r) => r.id}
        columns={[
          { header: 'Món', cell: (r) => r.name },
          { header: '', cell: () => <button>Sửa</button> },
          { header: '', cell: () => <button>Xóa</button> },
        ]}
      />,
    )
    expect(screen.getByText('Cà phê sữa')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sửa' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xóa' })).toBeInTheDocument()
  })

  it('báo trống khi không có dữ liệu', () => {
    render(
      <DataTable
        rows={[]}
        rowKey={() => 0}
        columns={[{ header: 'A', cell: () => null }]}
        empty="Không có hóa đơn."
      />,
    )
    expect(screen.getByText('Không có hóa đơn.')).toBeInTheDocument()
  })
})
