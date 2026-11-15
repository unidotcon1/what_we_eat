import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AVATAR_EMOJI, DEFAULT_AVATAR } from '../../domain/avatar'
import { AvatarBadge } from './AvatarBadge'
import { AvatarDesigner } from './AvatarDesigner'

describe('AvatarBadge', () => {
  test('is one image with a spoken label, carrying its shape and colour', () => {
    render(<AvatarBadge avatar={{ shape: 'hexagon', colour: 'cotton', kind: 'initials', text: 'LQ' }} />)
    const img = screen.getByRole('img', { name: 'Profile picture: LQ' })
    expect(img).toHaveTextContent('LQ')
    expect(img).toHaveAttribute('data-shape', 'hexagon')
    expect(img).toHaveAttribute('data-colour', 'cotton')
  })
})

describe('AvatarDesigner', () => {
  const setup = (start = DEFAULT_AVATAR) => {
    const on_save = vi.fn()
    const on_cancel = vi.fn()
    render(<AvatarDesigner start={start} on_save={on_save} on_cancel={on_cancel} />)
    return { on_save, on_cancel }
  }

  test('starts from the current picture', () => {
    setup()
    expect(screen.getByRole('radio', { name: 'Circle' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Cherry' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Emoji' })).toBeChecked()
  })

  test('the preview follows each choice, and Save hands back the design', async () => {
    const { on_save } = setup()
    await userEvent.click(screen.getByRole('radio', { name: 'Hexagon' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Maroon' }))
    await userEvent.click(screen.getByRole('radio', { name: AVATAR_EMOJI[2] }))
    const preview = screen.getByRole('img', { name: 'Profile picture' })
    expect(preview).toHaveAttribute('data-shape', 'hexagon')
    expect(preview).toHaveAttribute('data-colour', 'maroon')
    expect(preview).toHaveTextContent(AVATAR_EMOJI[2])
    await userEvent.click(screen.getByRole('button', { name: 'Save picture' }))
    expect(on_save).toHaveBeenCalledWith({ shape: 'hexagon', colour: 'maroon', kind: 'emoji', text: AVATAR_EMOJI[2] })
  })

  test('initials are typed, cleaned as you type, and saved', async () => {
    const { on_save } = setup()
    await userEvent.click(screen.getByRole('radio', { name: 'Initials' }))
    expect(screen.queryByRole('radio', { name: AVATAR_EMOJI[0] })).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Your initials (up to 2)'), 'l.q!z')
    expect(screen.getByLabelText('Your initials (up to 2)')).toHaveValue('LQ')
    await userEvent.click(screen.getByRole('button', { name: 'Save picture' }))
    expect(on_save).toHaveBeenCalledWith({ ...DEFAULT_AVATAR, kind: 'initials', text: 'LQ' })
  })

  test('switching back to emoji brings an emoji back', async () => {
    const { on_save } = setup({ ...DEFAULT_AVATAR, kind: 'initials', text: 'LQ' })
    await userEvent.click(screen.getByRole('radio', { name: 'Emoji' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save picture' }))
    expect(on_save).toHaveBeenCalledWith(DEFAULT_AVATAR)
  })

  test('Cancel saves nothing', async () => {
    const { on_save, on_cancel } = setup()
    await userEvent.click(screen.getByRole('radio', { name: 'Square' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(on_cancel).toHaveBeenCalled()
    expect(on_save).not.toHaveBeenCalled()
  })
})
