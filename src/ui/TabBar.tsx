import { NavLink } from 'react-router-dom'
import { Compass, Crosshair, ListChecks, Map as MapIcon, User } from 'lucide-react'

const tabs = [
  { to: '/', label: 'Explore', Icon: Compass },
  { to: '/map', label: 'Map', Icon: MapIcon },
  { to: '/spots', label: 'Spots', Icon: ListChecks },
  { to: '/me', label: 'Profile', Icon: User },
]

function Tab({ to, label, Icon }: (typeof tabs)[number]) {
  return (
    <NavLink to={to} end={to === '/'} className="tab">
      <Icon size={22} aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  )
}

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      <Tab {...tabs[0]} />
      <Tab {...tabs[1]} />
      <NavLink to="/add" className="tab add" aria-label="Add a spot">
        <span className="add-shape" aria-hidden="true">
          <Crosshair size={26} />
        </span>
      </NavLink>
      <Tab {...tabs[2]} />
      <Tab {...tabs[3]} />
    </nav>
  )
}
