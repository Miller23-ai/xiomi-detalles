import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line
} from 'recharts'
import { TrendingUp, ShoppingCart, Wallet, DollarSign, Download, FileText, Table } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const fmt = v => `S/ ${Number(v || 0).toFixed(2)}`

export default function Finanzas() {
  const [data,    setData]    = useState([])
  const [period,  setPeriod]  = useState(6)
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState({})
  const [totals,  setTotals]  = useState({})

  useEffect(() => { fetchData() }, [period])

  async function fetchData() {
    setLoading(true)
    const months = []
    for (let i = period - 1; i >= 0; i--) {
      const d     = subMonths(new Date(), i)
      const start = format(startOfMonth(d), 'yyyy-MM-dd')
      const end   = format(endOfMonth(d), 'yyyy-MM-dd')
      months.push({ label: format(d, 'MMM yyyy', { locale: es }), labelShort: format(d, 'MMM', { locale: es }), start, end })
    }

    const results = await Promise.all(months.map(async m => {
      const [{ data: pedidos }, { data: compras }, { data: gastos }] = await Promise.all([
        supabase.from('pedidos').select('total').eq('estado', 'entregado').gte('fecha_pedido', m.start).lte('fecha_pedido', m.end),
        supabase.from('compras').select('total').gte('fecha', m.start).lte('fecha', m.end),
        supabase.from('gastos').select('monto').gte('fecha', m.start).lte('fecha', m.end),
      ])
      const ventas     = (pedidos  || []).reduce((s, p) => s + Number(p.total), 0)
      const materiales = (compras  || []).reduce((s, c) => s + Number(c.total), 0)
      const otros      = (gastos   || []).reduce((s, g) => s + Number(g.monto), 0)
      const ganancia   = ventas - materiales - otros
      return { mes: m.labelShort, mesCompleto: m.label, ventas, materiales, otros, ganancia }
    }))

    setData(results)
    setCurrent(results[results.length - 1] || {})
    const t = results.reduce((acc, m) => ({
      ventas:      (acc.ventas || 0)     + m.ventas,
      materiales:  (acc.materiales || 0) + m.materiales,
      otros:       (acc.otros || 0)      + m.otros,
      ganancia:    (acc.ganancia || 0)   + m.ganancia,
    }), {})
    setTotals(t)
    setLoading(false)
  }

  // ── Excel Export ──────────────────────────────────────────
  function exportExcel() {
    const rows = data.map(m => ({
      'Mes':           m.mesCompleto,
      'Ventas (S/)':   m.ventas.toFixed(2),
      'Materiales (S/)': m.materiales.toFixed(2),
      'Otros gastos (S/)': m.otros.toFixed(2),
      'Total gastos (S/)': (m.materiales + m.otros).toFixed(2),
      'Ganancia (S/)': m.ganancia.toFixed(2),
      'Margen (%)':    m.ventas > 0 ? ((m.ganancia / m.ventas) * 100).toFixed(0) : '0',
    }))
    rows.push({
      'Mes': 'TOTAL',
      'Ventas (S/)':       (totals.ventas || 0).toFixed(2),
      'Materiales (S/)':   (totals.materiales || 0).toFixed(2),
      'Otros gastos (S/)': (totals.otros || 0).toFixed(2),
      'Total gastos (S/)': ((totals.materiales || 0) + (totals.otros || 0)).toFixed(2),
      'Ganancia (S/)':     (totals.ganancia || 0).toFixed(2),
      'Margen (%)':        totals.ventas > 0 ? ((totals.ganancia / totals.ventas) * 100).toFixed(0) : '0',
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte financiero')

    // Columnas más anchas
    ws['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 11 }]

    XLSX.writeFile(wb, `xiomi-finanzas-${format(new Date(), 'yyyy-MM')}.xlsx`)
  }

  // ── PDF Export ──────────────────────────────────────────
  function exportPDF() {
    const doc = new jsPDF()

    // Header
    doc.setFillColor(244, 63, 138)
    doc.rect(0, 0, 210, 30, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Xiomi Detalles', 15, 14)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Reporte Financiero — ${format(new Date(), "MMMM yyyy", { locale: es })}`, 15, 22)

    // KPIs
    doc.setTextColor(40, 40, 40)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Resumen del período', 15, 42)

    const kpis = [
      ['Ventas totales', fmt(totals.ventas)],
      ['Gasto materiales', fmt(totals.materiales)],
      ['Otros gastos', fmt(totals.otros)],
      ['Ganancia neta', fmt(totals.ganancia)],
    ]
    kpis.forEach(([label, val], i) => {
      const x = 15 + (i % 2) * 95
      const y = 50 + Math.floor(i / 2) * 12
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(120, 120, 120)
      doc.text(label, x, y)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(40, 40, 40)
      doc.text(val, x, y + 6)
    })

    // Table
    autoTable(doc, {
      startY: 82,
      head: [['Mes', 'Ventas', 'Materiales', 'Otros', 'Total gastos', 'Ganancia', 'Margen']],
      body: [
        ...data.map(m => [
          m.mesCompleto,
          fmt(m.ventas),
          fmt(m.materiales),
          fmt(m.otros),
          fmt(m.materiales + m.otros),
          fmt(m.ganancia),
          `${m.ventas > 0 ? ((m.ganancia / m.ventas) * 100).toFixed(0) : 0}%`,
        ]),
        ['TOTAL', fmt(totals.ventas), fmt(totals.materiales), fmt(totals.otros),
         fmt((totals.materiales || 0) + (totals.otros || 0)), fmt(totals.ganancia),
         `${totals.ventas > 0 ? ((totals.ganancia / totals.ventas) * 100).toFixed(0) : 0}%`]
      ],
      headStyles: { fillColor: [244, 63, 138], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [255, 240, 246], textColor: [100, 0, 50], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [255, 248, 252] },
      styles: { fontSize: 9 },
    })

    // Footer
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(160, 160, 160)
      doc.text(`Generado por Xiomi Detalles · ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 15, 285)
      doc.text(`Página ${i} de ${pageCount}`, 190, 285, { align: 'right' })
    }

    doc.save(`xiomi-reporte-${format(new Date(), 'yyyy-MM')}.pdf`)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
    </div>
  )

  const margenActual = current.ventas > 0
    ? ((current.ganancia / current.ventas) * 100).toFixed(0) : 0

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {[3, 6, 12].map(m => (
            <button key={m} onClick={() => setPeriod(m)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all
                      ${period === m ? 'bg-pink-500 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-pink-300'}`}>
              {m} meses
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel}
                  className="btn-secondary text-xs">
            <Table size={14} className="text-emerald-600" /> Exportar Excel
          </button>
          <button onClick={exportPDF}
                  className="btn-secondary text-xs">
            <FileText size={14} className="text-red-500" /> Exportar PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0">
          <div className="flex items-center gap-2 mb-1"><TrendingUp size={14} className="opacity-80" /><p className="text-xs opacity-80">Ventas (mes)</p></div>
          <p className="text-xl font-bold">{fmt(current.ventas)}</p>
          <p className="text-xs opacity-70 mt-1">Período: {fmt(totals.ventas)}</p>
        </div>
        <div className="card bg-gradient-to-br from-amber-400 to-amber-500 text-white border-0">
          <div className="flex items-center gap-2 mb-1"><ShoppingCart size={14} className="opacity-80" /><p className="text-xs opacity-80">Materiales (mes)</p></div>
          <p className="text-xl font-bold">{fmt(current.materiales)}</p>
          <p className="text-xs opacity-70 mt-1">Período: {fmt(totals.materiales)}</p>
        </div>
        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <div className="flex items-center gap-2 mb-1"><Wallet size={14} className="opacity-80" /><p className="text-xs opacity-80">Otros gastos (mes)</p></div>
          <p className="text-xl font-bold">{fmt(current.otros)}</p>
          <p className="text-xs opacity-70 mt-1">Período: {fmt(totals.otros)}</p>
        </div>
        <div className={`card border-0 text-white bg-gradient-to-br ${(current.ganancia || 0) >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600'}`}>
          <div className="flex items-center gap-2 mb-1"><DollarSign size={14} className="opacity-80" /><p className="text-xs opacity-80">Ganancia (mes)</p></div>
          <p className="text-xl font-bold">{fmt(current.ganancia)}</p>
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

      {/* Line chart */}
      <div className="card">
        <h3 className="font-display text-base text-gray-700 mb-4">Tendencia de ganancias</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => `S/${v}`} />
            <Tooltip formatter={v => [fmt(v), 'Ganancia']} />
            <Line type="monotone" dataKey="ganancia" stroke="#10b981" strokeWidth={2.5}
                  dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
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
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 capitalize">{m.mesCompleto}</td>
                    <td className="px-4 py-3 text-sm text-emerald-600 font-semibold">{fmt(m.ventas)}</td>
                    <td className="px-4 py-3 text-sm text-amber-600">{fmt(m.materiales)}</td>
                    <td className="px-4 py-3 text-sm text-purple-600">{fmt(m.otros)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{fmt(totalGastos)}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${m.ganancia >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(m.ganancia)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                        ${Number(mg) >= 40 ? 'bg-emerald-100 text-emerald-700' : Number(mg) >= 20 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                        {mg}%
                      </span>
                    </td>
                  </tr>
                )
              })}
              <tr className="bg-pink-50 font-semibold">
                <td className="px-4 py-3 text-sm">TOTAL</td>
                <td className="px-4 py-3 text-sm text-emerald-600">{fmt(totals.ventas)}</td>
                <td className="px-4 py-3 text-sm text-amber-600">{fmt(totals.materiales)}</td>
                <td className="px-4 py-3 text-sm text-purple-600">{fmt(totals.otros)}</td>
                <td className="px-4 py-3 text-sm">{fmt((totals.materiales||0) + (totals.otros||0))}</td>
                <td className={`px-4 py-3 text-sm font-bold ${(totals.ganancia||0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(totals.ganancia)}</td>
                <td className="px-4 py-3 text-xs font-medium text-gray-600">
                  {totals.ventas > 0 ? ((totals.ganancia / totals.ventas) * 100).toFixed(0) : 0}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
