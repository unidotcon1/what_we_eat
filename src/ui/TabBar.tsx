import { NavLink } from 'react-router-dom'
import { Compass, Bookmark, CheckSquare, User } from 'lucide-react'

const tabs = [
  { to: '/', label: 'Explore', Icon: Compass },
  { to: '/saved', label: 'Saved', Icon: Bookmark },
  { to: '/vote', label: 'Vote', Icon: CheckSquare },
  { to: '/me', label: 'Me', Icon: User },
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
