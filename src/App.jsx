import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/layout/Layout'
import Login from './components/auth/Login'
import Dashboard from './pages/Dashboard'
import Pedidos from './pages/Pedidos'
import Productos from './pages/Productos'
import Materiales from './pages/Materiales'
import Compras from './pages/Compras'
import Gastos from './pages/Gastos'
import Finanzas from './pages/Finanzas'
import Categorias from './pages/Categorias'
import Configuracion from './pages/Configuracion'

function ProtectedRoutes() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
         style={{ background: 'linear-gradient(135deg, #fdf2f8, #fce7f3)' }}>
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-pink-400 text-sm font-medium">Cargando Xiomi Detalles...</p>
      </div>
    </div>
  )

  if (!user) return <Login />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/"              element={<Dashboard />} />
        <Route path="/pedidos"       element={<Pedidos />} />
        <Route path="/productos"     element={<Productos />} />
        <Route path="/materiales"    element={<Materiales />} />
        <Route path="/compras"       element={<Compras />} />
        <Route path="/gastos"        element={<Gastos />} />
        <Route path="/finanzas"      element={<Finanzas />} />
        <Route path="/categorias"    element={<Categorias />} />
        <Route path="/configuracion" element={<Configuracion />} />
        <Route path="*"              element={<Navigate to="/" />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProtectedRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
