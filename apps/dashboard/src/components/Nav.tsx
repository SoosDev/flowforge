import { NavLink, useNavigate } from 'react-router-dom'
import { clearToken } from '../lib/auth.js'

const LINKS = [
  { to: '/workflows', label: 'Workflows' },
  { to: '/workers', label: 'Workers' },
  { to: '/logs', label: 'Logs' },
]

export function Nav() {
  const navigate = useNavigate()
  const logout = () => { clearToken(); navigate('/login', { replace: true }) }

  return (
    <nav className="flex items-center gap-6 px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-panel)]">
      <span className="text-white font-bold text-sm tracking-tight mr-4">FlowForge</span>
      {LINKS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `text-sm transition-colors ${isActive ? 'text-white font-medium' : 'text-slate-400 hover:text-white'}`
          }
        >
          {label}
        </NavLink>
      ))}
      <button
        onClick={logout}
        className="ml-auto text-slate-400 hover:text-white text-sm transition-colors"
      >
        Sign out
      </button>
    </nav>
  )
}
