import { clean_text } from './text'
import type { MenuSection } from './types'

const MAX_SECTIONS = 20
const MAX_ITEMS = 60

/** Pictures must be our own files under /restaurants/ (the security policy only lets the page load images from its own address). */
export function safe_image_path(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 120) return undefined
  if (!/^\/restaurants\/[A-Za-z0-9_\-./]+\.(webp|jpe?g|png|avif)$/i.test(value)) return undefined
  if (value.includes('..') || value.includes('//')) return undefined
  return value
}

/** A menu link leaves our site, so it must be a plain https address: no scripts, no data pages, no passwords in the link. */
export function safe_menu_url(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 300) return undefined
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return undefined
  }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return undefined
  return url.href
}

/** Reads a menu from untrusted data. Bad entries are dropped, not fatal, and sizes are capped. */
export function parse_menu(value: unknown): MenuSection[] | undefined {
  if (!Array.isArray(value)) return undefined
  const sections: MenuSection[] = []
  for (const raw of value.slice(0, MAX_SECTIONS)) {
    if (!raw || typeof raw !== 'object') continue
    const entry = raw as { section?: unknown; items?: unknown }
    const section = typeof entry.section === 'string' ? clean_text(entry.section, 60) : ''
    if (!section || !Array.isArray(entry.items)) continue
    const items: MenuSection['items'] = []
    for (const item of entry.items.slice(0, MAX_ITEMS)) {
      if (!item || typeof item !== 'object') continue
      const dish = item as { name?: unknown; price?: unknown }
      const name = typeof dish.name === 'string' ? clean_text(dish.name, 80) : ''
      if (!name) continue
      const price = typeof dish.price === 'string' ? clean_text(dish.price, 20) : ''
      items.push(price ? { name, price } : { name })
    }
    if (items.length) sections.push({ section, items })
  }
  return sections.length ? sections : undefined
}
