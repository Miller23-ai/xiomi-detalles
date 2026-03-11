import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard, ShoppingCart, Package, Gift, BarChart2,
  LogOut, ChevronRight, Flower2, Receipt, X, Wallet
} from 'lucide-react'

const links = [
  { to: '/',           label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/pedidos',    label: 'Pedidos',        icon: Gift },
  { to: '/productos',  label: 'Productos',      icon: Package },
  { to: '/materiales', label: 'Materiales',     icon: Flower2 },
  { to: '/compras',    label: 'Compras',        icon: ShoppingCart },
  { to: '/gastos',     label: 'Gastos',         icon: Wallet },
  { to: '/finanzas',   label: 'Finanzas',       icon: BarChart2 },
]

export default function Sidebar({ open, onClose }) {
  const { signOut, user } = useAuth()

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-64 z-30 flex flex-col
        transition-transform duration-300
        lg:translate-x-0 lg:static lg:z-auto
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `} style={{ background: 'linear-gradient(180deg, #1a0a10 0%, #2d0f1e 100%)' }}>

        {/* Logo */}
        <div className="p-5 border-b border-pink-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'linear-gradient(135deg, #f43f8a, #a8155a)' }}>
              <Gift size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-display text-white text-base leading-tight">Xiomi Detalles</p>
              <p className="text-pink-400/60 text-xs">Panel de Gestión</p>
            </div>
            <button onClick={onClose} className="lg:hidden text-pink-300/50 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-pink-500/40 text-xs font-medium uppercase tracking-widest px-4 mb-3">Menú</p>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={17} />
              <span className="flex-1">{label}</span>
              <ChevronRight size={14} className="opacity-30" />
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="p-4 border-t border-pink-900/40">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-pink-500/30 flex items-center justify-center text-pink-200 text-xs font-bold">
              {user?.email?.[0]?.toUpperCase() || 'X'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-pink-200 text-xs font-medium truncate">{user?.email}</p>
              <p className="text-pink-500/50 text-xs">Administradora</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="sidebar-link w-full text-red-400/70 hover:text-red-300 hover:bg-red-900/20"
          >
            <LogOut size={17} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
