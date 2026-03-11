import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Wallet, BarChart2 } from 'lucide-react'

const fmt = v => `S/ ${Number(v).toFixed(2)}`

export default function Finanzas() {
  const [data,    setData]    = useState([])
  const [period,  setPeriod]  = useState(6) // months
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState({})

  useEffect(() => { fetchData() }, [period])

  async function fetchData() {
    setLoading(true)
    const months = []
    for (let i = period - 1; i >= 0; i--) {
      const d     = subMonths(new Date(), i)
      const start = format(startOfMonth(d), 'yyyy-MM-dd')
      const end   = format(endOfMonth(d), 'yyyy-MM-dd')
      months.push({ label: format(d, 'MMM', { locale: es }), start, end, full: d })
    }

    const results = await Promise.all(months.map(async m => {
      const [{ data: pedidos }, { data: compras }, { data: gastos }] = await Promise.all([
        supabase.from('pedidos').select('total').eq('estado', 'entregado')
          .gte('fecha_pedido', m.start).lte('fecha_pedido', m.end),
        supabase.from('compras').select('total').gte('fecha', m.start).lte('fecha', m.end),
        supabase.from('gastos').select('monto').gte('fecha', m.start).lte('fecha', m.end),
      ])
      const ventas   = pedidos?.reduce((s, p) => s + p.total, 0) || 0
      const materiales = compras?.reduce((s, c) => s + c.total, 0) || 0
      const otros    = gastos?.reduce((s, g) => s + g.monto, 0) || 0
      const ganancia = ventas - materiales - otros
      return { mes: m.label, ventas, materiales, otros, ganancia }
    }))

    setData(results)

    // Current month totals
    const cur = results[results.length - 1] || {}
    setCurrent(cur)

    setLoading(false)
  }

  // All-time totals
  const totals = data.reduce((acc, m) => ({
    ventas:      (acc.ventas || 0)     + m.ventas,
    materiales:  (acc.materiales || 0) + m.materiales,
    otros:       (acc.otros || 0)      + m.otros,
    ganancia:    (acc.ganancia || 0)   + m.ganancia,
  }), {})

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
    </div>
  )

  const margenActual = current.ventas > 0
    ? ((current.ganancia / current.ventas) * 100).toFixed(0)
    : 0

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm text-gray-500 font-medium">Reporte financiero</h2>
        <div className="flex gap-2">
          {[3, 6, 12].map(m => (
            <button key={m} onClick={() => setPeriod(m)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all
                      ${period === m ? 'bg-pink-500 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-pink-300'}`}>
              {m} meses
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="opacity-80" />
            <p className="text-xs opacity-80">Ventas (mes)</p>
          </div>
          <p className="text-xl font-bold">{fmt(current.ventas || 0)}</p>
          <p className="text-xs opacity-70 mt-1">Total período: {fmt(totals.ventas || 0)}</p>
        </div>

        <div className="card bg-gradient-to-br from-amber-400 to-amber-500 text-white border-0">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart size={14} className="opacity-80" />
            <p className="text-xs opacity-80">Materiales (mes)</p>
          </div>
          <p className="text-xl font-bold">{fmt(current.materiales || 0)}</p>
          <p className="text-xs opacity-70 mt-1">Total período: {fmt(totals.materiales || 0)}</p>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={14} className="opacity-80" />
            <p className="text-xs opacity-80">Otros gastos (mes)</p>
          </div>
          <p className="text-xl font-bold">{fmt(current.otros || 0)}</p>
          <p className="text-xs opacity-70 mt-1">Total período: {fmt(totals.otros || 0)}</p>
        </div>

        <div className={`card border-0 text-white bg-gradient-to-br ${
          (current.ganancia || 0) >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={14} className="opacity-80" />
            <p className="text-xs opacity-80">Ganancia (mes)</p>
          </div>
          <p className="text-xl font-bold">{fmt(current.ganancia || 0)}</p>
          <p className="text-xs opacity-70 mt-1">Margen: {margenActual}%</p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="card">
        <h3 className="font-display text-base text-gray-700 mb-4">Ventas vs Gastos por mes</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => `S/${v}`} />
            <Tooltip formatter={(v, n) => [fmt(v), n === 'ventas' ? 'Ventas' : n === 'materiales' ? 'Materiales' : n === 'otros' ? 'Otros gastos' : 'Ganancia']} />
            <Legend formatter={n => n === 'ventas' ? 'Ventas' : n === 'materiales' ? 'Materiales' : n === 'otros' ? 'Otros gastos' : 'Ganancia'} />
            <Bar dataKey="ventas"     fill="#f43f8a" radius={[4,4,0,0]} />
            <Bar dataKey="materiales" fill="#fbbf24" radius={[4,4,0,0]} />
            <Bar dataKey="otros"      fill="#a78bfa" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Line chart - ganancia */}
      <div className="card">
        <h3 className="font-display text-base text-gray-700 mb-4">Tendencia de ganancias</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => `S/${v}`} />
            <Tooltip formatter={v => [fmt(v), 'Ganancia']} />
            <Line type="monotone" dataKey="ganancia" stroke="#10b981" strokeWidth={2.5}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-display text-base text-gray-700">Resumen mensual</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Mes', 'Ventas', 'Materiales', 'Otros gastos', 'Total gastos', 'Ganancia', 'Margen'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((m, i) => {
                const totalGastos = m.materiales + m.otros
                const mg = m.ventas > 0 ? ((m.ganancia / m.ventas) * 100).toFixed(0) : 0
                return (
                  <tr key={i} className="border-b border-gray-50 hover:bg-pink-50/20">
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 capitalize">{m.mes}</td>
                    <td className="px-4 py-3 text-sm text-emerald-600 font-semibold">{fmt(m.ventas)}</td>
                    <td className="px-4 py-3 text-sm text-amber-600">{fmt(m.materiales)}</td>
                    <td className="px-4 py-3 text-sm text-purple-600">{fmt(m.otros)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{fmt(totalGastos)}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${m.ganancia >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {fmt(m.ganancia)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        Number(mg) >= 40 ? 'bg-emerald-100 text-emerald-700'
                        : Number(mg) >= 20 ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-600'
                      }`}>{mg}%</span>
                    </td>
                  </tr>
                )
              })}
              {/* Totals row */}
              <tr className="bg-pink-50 font-semibold">
                <td className="px-4 py-3 text-sm">TOTAL</td>
                <td className="px-4 py-3 text-sm text-emerald-600">{fmt(totals.ventas || 0)}</td>
                <td className="px-4 py-3 text-sm text-amber-600">{fmt(totals.materiales || 0)}</td>
                <td className="px-4 py-3 text-sm text-purple-600">{fmt(totals.otros || 0)}</td>
                <td className="px-4 py-3 text-sm">{fmt((totals.materiales || 0) + (totals.otros || 0))}</td>
                <td className={`px-4 py-3 text-sm font-bold ${(totals.ganancia || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {fmt(totals.ganancia || 0)}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium text-gray-600">
                    {totals.ventas > 0 ? ((totals.ganancia / totals.ventas) * 100).toFixed(0) : 0}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
