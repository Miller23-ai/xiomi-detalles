import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import { Plus, Trash2, Pencil, Wallet } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const CATEGORIAS = ['Transporte','Empaques','Servicios','Marketing','Herramientas','Alimentación','Otros']
const emptyForm  = { fecha: format(new Date(), 'yyyy-MM-dd'), categoria: 'Otros', descripcion: '', monto: '' }

export default function Gastos() {
  const [gastos,  setGastos]  = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [form,    setForm]    = useState(emptyForm)
  const [saving,  setSaving]  = useState(false)
  const [filter,  setFilter]  = useState('todos')

  useEffect(() => { fetchGastos() }, [])

  async function fetchGastos() {
    setLoading(true)
    const { data } = await supabase.from('gastos').select('*').order('fecha', { ascending: false })
    setGastos(data || [])
    setLoading(false)
  }

  function openNew()  { setEditing(null); setForm(emptyForm); setModal(true) }
  function openEdit(g) {
    setEditing(g.id)
    setForm({ fecha: g.fecha, categoria: g.categoria, descripcion: g.descripcion, monto: g.monto })
    setModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = { ...form, monto: Number(form.monto) }
    if (editing) await supabase.from('gastos').update(payload).eq('id', editing)
    else         await supabase.from('gastos').insert(payload)
    setSaving(false); setModal(false); fetchGastos()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este gasto?')) return
    await supabase.from('gastos').delete().eq('id', id)
    fetchGastos()
  }

  const mesActual = new Date().toISOString().slice(0, 7)
  const totalMes  = gastos.filter(g => g.fecha?.startsWith(mesActual)).reduce((s, g) => s + g.monto, 0)
  const total     = gastos.reduce((s, g) => s + g.monto, 0)

  const categorias  = ['todos', ...new Set(gastos.map(g => g.categoria))]
  const filtered    = gastos.filter(g => filter === 'todos' || g.categoria === filter)

  const catTotals = CATEGORIAS.map(c => ({
    cat: c,
    total: gastos.filter(g => g.categoria === c).reduce((s, g) => s + g.monto, 0)
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  const CAT_COLORS = {
    Transporte: 'bg-blue-100 text-blue-600',
    Empaques: 'bg-pink-100 text-pink-600',
    Servicios: 'bg-purple-100 text-purple-600',
    Marketing: 'bg-orange-100 text-orange-600',
    Herramientas: 'bg-teal-100 text-teal-600',
    Alimentación: 'bg-green-100 text-green-600',
    Otros: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-purple-600">S/ {totalMes.toFixed(2)}</p>
          <p className="text-xs text-gray-400">Gastos este mes</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-700">S/ {total.toFixed(2)}</p>
          <p className="text-xs text-gray-400">Total histórico</p>
        </div>
        <div className="card col-span-2 md:col-span-1">
          <p className="text-xs text-gray-400 mb-2">Por categoría (total)</p>
          <div className="space-y-1">
            {catTotals.slice(0, 4).map(c => (
              <div key={c.cat} className="flex justify-between items-center">
                <span className={`text-xs px-2 py-0.5 rounded-full ${CAT_COLORS[c.cat] || CAT_COLORS.Otros}`}>{c.cat}</span>
                <span className="text-xs font-medium text-gray-600">S/ {c.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {categorias.map(c => (
            <button key={c} onClick={() => setFilter(c)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all
                      ${filter === c ? 'bg-purple-500 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-purple-300'}`}>
              {c === 'todos' ? 'Todos' : c}
            </button>
          ))}
        </div>
        <button onClick={openNew} className="btn-primary text-xs">
          <Plus size={14} /> Registrar gasto
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-purple-50/40">
                {['Fecha','Categoría','Descripción','Monto','Acciones'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400 text-sm">Sin gastos registrados</td></tr>
              )}
              {filtered.map(g => (
                <tr key={g.id} className="border-b border-gray-50 hover:bg-purple-50/20 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {format(new Date(g.fecha + 'T12:00:00'), 'd MMM', { locale: es })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${CAT_COLORS[g.categoria] || CAT_COLORS.Otros}`}>
                      {g.categoria}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{g.descripcion}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-700">S/ {Number(g.monto).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(g)}
                              className="p-1.5 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-lg transition-all">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(g.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar gasto' : 'Registrar gasto'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
              <input type="date" value={form.fecha} onChange={e => setForm(p => ({...p, fecha: e.target.value}))}
                     className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
              <select value={form.categoria} onChange={e => setForm(p => ({...p, categoria: e.target.value}))}
                      className="select-field">
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción *</label>
            <input value={form.descripcion} onChange={e => setForm(p => ({...p, descripcion: e.target.value}))}
                   className="input-field" placeholder="¿En qué se gastó?" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Monto (S/) *</label>
            <input type="number" value={form.monto} onChange={e => setForm(p => ({...p, monto: e.target.value}))}
                   className="input-field" placeholder="0.00" step="0.50" min="0" />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave}
                    disabled={saving || !form.descripcion || !form.monto}
                    className="btn-primary">
              {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
