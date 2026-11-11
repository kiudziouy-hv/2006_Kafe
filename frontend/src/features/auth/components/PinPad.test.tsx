import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { PinPad } from './PinPad'

function Harness({ onSubmit }: { onSubmit: () => void }) {
  const [v, setV] = useState('')
  return (
    <>
      <output data-testid="v">{v}</output>
      <PinPad value={v} onChange={setV} onSubmit={onSubmit} />
    </>
  )
}

describe('PinPad', () => {
  it('nhận tối đa 6 chữ số, Xóa lùi một số, OK gửi đi', async () => {
    const submit = vi.fn()
    render(<Harness onSubmit={submit} />)
    const user = userEvent.setup()
    for (const k of ['1', '2', '3', '4', '5', '6', '7'])
      await user.click(screen.getByRole('button', { name: k }))
    expect(screen.getByTestId('v')).toHaveTextContent('123456')
    await user.click(screen.getByRole('button', { name: 'Xóa' }))
    expect(screen.getByTestId('v')).toHaveTextContent('12345')
    await user.click(screen.getByRole('button', { name: 'OK' }))
    expect(submit).toHaveBeenCalledTimes(1)
  })
})
