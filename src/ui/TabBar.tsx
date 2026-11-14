import { NavLink } from 'react-router-dom'
import { Compass, Map as MapIcon, Target, User } from 'lucide-react'

const tabs = [
  { to: '/', label: 'Explore', Icon: Compass },
  { to: '/map', label: 'Map', Icon: MapIcon },
  { to: '/spots', label: 'Spots', Icon: Target },
  { to: '/me', label: 'Profile', Icon: User },
]

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} className="tab">
          <span className="tab-pill">
            <Icon size={22} aria-hidden="true" />
          </span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
