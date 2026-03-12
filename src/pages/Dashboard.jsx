import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import StatCard from '../components/ui/StatCard'
import { Link } from 'react-router-dom'
import {
  Gift, TrendingUp, ShoppingCart, Package,
  AlertTriangle, Clock, CheckCircle2, Flower2, Wallet, PiggyBank, RefreshCw
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { format, subDays, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_COLORS = {
  pendiente:  '#f59e0b',
  en_proceso: '#3b82f6',
  listo:      '#10b981',
  entregado:  '#6b7280',
  cancelado:  '#ef4444',
}
const statusLabel = {
  pendiente: 'Pendiente', en_proceso: 'En proceso',
  listo: 'Listo', entregado: 'Entregado', cancelado: 'Cancelado'
}
const fmt = v => `S/ ${Number(v || 0).toFixed(2)}`

export default function Dashboard() {
  const [stats,        setStats]        = useState({})
  const [salesChart,   setSalesChart]   = useState([])
  const [statusPie,    setStatusPie]    = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [lowStock,     setLowStock]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      const hoy    = new Date()
      const inicio = format(startOfMonth(hoy), 'yyyy-MM-dd')

      const { data: config } = await supabase
        .from('configuracion').select('clave, valor')
        .in('clave', ['saldo_inicial'])
      const saldoInicial = Number(config?.find(c => c.clave === 'saldo_inicial')?.valor || 0)

      const { data: pedidosMes } = await supabase
        .from('pedidos').select('total, adelanto, estado, fecha_pedido')
        .gte('fecha_pedido', inicio)

      const ventasMes   = (pedidosMes || []).filter(p => p.estado === 'entregado').reduce((s, p) => s + Number(p.total), 0)
      const pedidosPend = (pedidosMes || []).filter(p => p.estado === 'pendiente').length
      const pedidosProc = (pedidosMes || []).filter(p => p.estado === 'en_proceso').length
      const cobrarPend  = (pedidosMes || [])
        .filter(p => p.estado !== 'entregado' && p.estado !== 'cancelado')
        .reduce((s, p) => s + (Number(p.total) - Number(p.adelanto || 0)), 0)

      const { data: comprasMes } = await supabase
        .from('compras').select('total').gte('fecha', inicio)
      const gastoMateriales = (comprasMes || []).reduce((s, c) => s + Number(c.total), 0)

      const { data: gastosMes } = await supabase
        .from('gastos').select('monto').gte('fecha', inicio)
      const gastosVarios = (gastosMes || []).reduce((s, g) => s + Number(g.monto), 0)

      const ganancia   = ventasMes - gastoMateriales - gastosVarios
      const saldoActual = saldoInicial + ganancia

      const { count: totalActivos } = await supabase
        .from('pedidos').select('*', { count: 'exact', head: true })
        .in('estado', ['pendiente', 'en_proceso', 'listo'])

      setStats({ ventasMes, gastoMateriales, gastosVarios, ganancia, pedidosPend, pedidosProc, totalActivos, saldoInicial, saldoActual, cobrarPend })

      const last7 = Array.from({ length: 7 }, (_, i) => format(subDays(hoy, 6 - i), 'yyyy-MM-dd'))
      const { data: ventasDias } = await supabase
        .from('pedidos').select('total, fecha_pedido')
        .gte('fecha_pedido', last7[0]).eq('estado', 'entregado')

      setSalesChart(last7.map(dia => ({
        dia: format(new Date(dia + 'T12:00:00'), 'EEE', { locale: es }),
        ventas: (ventasDias || []).filter(p => p.fecha_pedido === dia).reduce((s, p) => s + Number(p.total), 0),
      })))

      const { data: allPedidos } = await supabase
        .from('pedidos').select('estado').not('estado', 'eq', 'entregado')
      const counts = {}
      ;(allPedidos || []).forEach(p => { counts[p.estado] = (counts[p.estado] || 0) + 1 })
      setStatusPie(Object.entries(counts).map(([name, value]) => ({ name, value })))

      const { data: recent } = await supabase
        .from('pedidos').select('*').order('created_at', { ascending: false }).limit(6)
      setRecentOrders(recent || [])

      // Fix: no usar supabase.raw() - filtrar en JS
      const { data: allMat } = await supabase
        .from('materiales').select('nombre, stock_actual, stock_minimo, unidad')
      setLowStock((allMat || []).filter(m => Number(m.stock_actual) <= Number(m.stock_minimo)))

    } catch (err) {
      console.error('Dashboard error:', err)
      setError('Error al cargar los datos. Verifica la conexión con Supabase.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="w-10 h-10 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
      <p className="text-pink-400 text-sm font-medium">Cargando dashboard...</p>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-md text-center">
        <AlertTriangle size={32} className="text-red-400 mx-auto mb-2" />
        <p className="text-red-700 font-medium text-sm mb-2">{error}</p>
        <button onClick={fetchAll} className="btn-primary text-xs mx-auto">
          <RefreshCw size={13} /> Reintentar
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard label="Ventas del mes"     value={fmt(stats.ventasMes)}      icon={TrendingUp}    color="green" />
        <StatCard label="Ganancia estimada"  value={fmt(stats.ganancia)}        icon={TrendingUp}    color={stats.ganancia >= 0 ? 'green' : 'red'} />
        <StatCard label="Saldo en caja"      value={fmt(stats.saldoActual)}     icon={PiggyBank}     color="pink"
                  sub={`Inicial: S/ ${Number(stats.saldoInicial||0).toFixed(2)}`} />
        <StatCard label="Por cobrar"         value={fmt(stats.cobrarPend)}      icon={Wallet}        color="amber" sub="saldo pendiente" />
        <StatCard label="Gasto materiales"   value={fmt(stats.gastoMateriales)} icon={ShoppingCart}  color="amber" />
        <StatCard label="Gastos varios"      value={fmt(stats.gastosVarios)}    icon={Wallet}        color="purple" />
        <StatCard label="Pedidos activos"    value={stats.totalActivos || 0}    icon={Gift}          color="pink" />
        <StatCard label="Stock bajo"         value={lowStock.length}            icon={AlertTriangle} color="red"
                  sub={lowStock.length > 0 ? 'materiales por reponer' : 'todo OK'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card lg:col-span-2">
          <h2 className="font-display text-base text-gray-700 mb-4">Ventas — últimos 7 días</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={salesChart}>
              <defs>
                <linearGradient id="pinkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f43f8a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f8a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" />
              <XAxis dataKey="dia" tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={v => `S/${v}`} />
              <Tooltip formatter={v => [`S/ ${Number(v).toFixed(2)}`, 'Ventas']} />
              <Area type="monotone" dataKey="ventas" stroke="#f43f8a" strokeWidth={2}
                    fill="url(#pinkGrad)" dot={{ fill: '#f43f8a', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="font-display text-base text-gray-700 mb-4">Estado de pedidos</h2>
          {statusPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                     dataKey="value" nameKey="name">
                  {statusPie.map((entry, i) => (
                    <Cell key={i} fill={ESTADO_COLORS[entry.name] || '#f43f8a'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, statusLabel[n] || n]} />
                <Legend formatter={n => statusLabel[n] || n} iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              No hay pedidos activos
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base text-gray-700">Pedidos recientes</h2>
            <Link to="/pedidos" className="text-pink-500 text-xs font-medium hover:underline">Ver todos →</Link>
          </div>
          <div className="space-y-2">
            {recentOrders.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-6">Sin pedidos aún</p>
            )}
            {recentOrders.map(order => (
              <div key={order.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-pink-50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-sm flex-shrink-0">
                  {order.cliente_nombre?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{order.cliente_nombre}</p>
                  <p className="text-xs text-gray-400">
                    {order.fecha_entrega
                      ? `Entrega: ${format(new Date(order.fecha_entrega + 'T12:00:00'), 'd MMM', { locale: es })}`
                      : 'Sin fecha de entrega'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-700">S/ {order.total}</p>
                  <span className={`badge-${order.estado}`}>{statusLabel[order.estado]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base text-gray-700">Stock bajo ⚠️</h2>
            <Link to="/materiales" className="text-pink-500 text-xs font-medium hover:underline">Ver materiales →</Link>
          </div>
          <div className="space-y-2">
            {lowStock.length === 0 && (
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 rounded-xl px-4 py-3 text-sm">
                <CheckCircle2 size={16} /> Todo el inventario está en orden
              </div>
            )}
            {lowStock.slice(0, 5).map((mat, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                <Flower2 size={16} className="text-red-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{mat.nombre}</p>
                  <p className="text-xs text-red-500">Stock: {mat.stock_actual} · Mín: {mat.stock_minimo} {mat.unidad}</p>
                </div>
                <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-medium">Reponer</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
