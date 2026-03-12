import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Menu, Bell } from 'lucide-react'

const titles = {
  '/':           'Dashboard',
  '/pedidos':    'Pedidos',
  '/productos':  'Productos',
  '/materiales': 'Materiales',
  '/compras':    'Compras',
  '/gastos':     'Gastos varios',
  '/finanzas':      'Finanzas',
  '/categorias':    'Categorías',
  '/configuracion': 'Configuración',
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const title = titles[location.pathname] || 'Panel'

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#fdf4f8' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-pink-100 px-5 py-3.5 flex items-center gap-4 flex-shrink-0">
          <button
            className="lg:hidden text-gray-400 hover:text-pink-500 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>
          <h1 className="font-display text-xl text-gray-800 flex-1">{title}</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden sm:block">
              {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
