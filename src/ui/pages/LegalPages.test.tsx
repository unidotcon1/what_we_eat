import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PrivacyPage, TermsPage } from './LegalPages'

const in_router = (page: React.ReactElement) => render(<MemoryRouter>{page}</MemoryRouter>)

test('the privacy policy names what is stored and who handles it', () => {
  in_router(<PrivacyPage />)
  expect(screen.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeInTheDocument()
  const text = document.body.textContent ?? ''
  for (const word of ['Google', 'Supabase', 'Cloudflare', 'OpenStreetMap', 'email address']) {
    expect(text).toContain(word)
  }
})

test('the privacy policy says location stays in the browser and nothing is sold', () => {
  in_router(<PrivacyPage />)
  const text = document.body.textContent ?? ''
  expect(text).toMatch(/location.*(never sent|stays on your device)/i)
  expect(text).toMatch(/do not sell/i)
})

test('the privacy policy says anyone with a poll link can see that poll', () => {
  in_router(<PrivacyPage />)
  expect(document.body.textContent).toMatch(/anyone with (a|the) (poll )?link can see/i)
})

test('the privacy policy tells people how to ask for their data to be deleted', () => {
  in_router(<PrivacyPage />)
  const link = screen.getByRole('link', { name: /open an issue/i })
  expect(link).toHaveAttribute('href', 'https://github.com/unidotcon1/what_we_eat/issues')
})

test('the terms say restaurant listings are samples and the app is provided as is', () => {
  in_router(<TermsPage />)
  expect(screen.getByRole('heading', { level: 1, name: 'Terms of service' })).toBeInTheDocument()
  const text = document.body.textContent ?? ''
  expect(text).toMatch(/sample/i)
  expect(text).toMatch(/as is/i)
})

test('both pages link back to the app and to each other', () => {
  in_router(<PrivacyPage />)
  expect(screen.getByRole('link', { name: /back to what we eat/i })).toHaveAttribute('href', '/')
  expect(screen.getByRole('link', { name: 'Terms of service' })).toHaveAttribute('href', '/terms')
})
