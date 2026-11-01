import { NavLink } from 'react-router-dom'
import { Compass, ListChecks, Map as MapIcon, User } from 'lucide-react'

const tabs = [
  { to: '/', label: 'Explore', Icon: Compass },
  { to: '/map', label: 'Map', Icon: MapIcon },
  { to: '/spots', label: 'Spots', Icon: ListChecks },
  { to: '/me', label: 'Profile', Icon: User },
]

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} className="tab">
          <Icon size={22} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
