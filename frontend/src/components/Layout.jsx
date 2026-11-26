import { NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../auth'

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/ventas', label: 'Ventas' },
  { to: '/reportes', label: 'Reportes' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  const linkClass = ({ isActive }) =>
    `block rounded-lg px-3 py-2 text-sm font-medium ${
      isActive ? 'bg-brand text-white' : 'text-gray-700 hover:bg-gray-200'
    }`

  return (
    <div className="min-h-screen bg-gray-100 md:flex">
      <aside
        className={`${open ? 'block' : 'hidden'} w-full border-r border-gray-200 bg-white p-4 md:block md:w-56`}
      >
        <p className="mb-6 text-xl font-bold text-brand">VentasLite</p>
        <nav aria-label="Principal" className="space-y-1">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass} onClick={() => setOpen(false)}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm md:hidden"
            aria-label="Abrir menú"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            Menú
          </button>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-gray-700">
              {user?.name} · <span className="capitalize">{user?.role}</span>
            </span>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-900 hover:bg-gray-100"
            >
              Salir
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
