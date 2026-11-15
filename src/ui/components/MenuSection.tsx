import { ExternalLink } from 'lucide-react'
import type { Restaurant } from '../../domain/types'

/** The menu: dishes and prices when we have them, the restaurant's own menu page when we have that, otherwise a plain note. */
export function MenuSection({ r }: { r: Restaurant }) {
  const has_dishes = !!r.menu && r.menu.length > 0
  return (
    <section className="menu-section">
      <h2>Menu</h2>
      {has_dishes &&
        r.menu!.map((group) => (
          <div key={group.section} role="group" aria-label={group.section} className="menu-group">
            <h3>{group.section}</h3>
            <ul>
              {group.items.map((item) => (
                <li key={item.name}>
                  <span>{item.name}</span>
                  {item.price && <span className="price">{item.price}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      {r.menu_url && (
        <a className="quiet" href={r.menu_url} target="_blank" rel="noopener noreferrer">
          See the menu on their website <ExternalLink size={16} aria-hidden="true" />
        </a>
      )}
      {!has_dishes && !r.menu_url && <p className="sub">Menu not added yet</p>}
    </section>
  )
}
