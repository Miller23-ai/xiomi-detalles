import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import { Plus, Pencil, Trash2, Search, AlertTriangle, CheckCircle2 } from 'lucide-react'

const CATEGORIAS = ['Flores artificiales','Telas y cintas','Complementos','Cajas y empaques','Luces LED','Peluches','Otros']
const UNIDADES   = ['unidad','metro','pliego','rollo','caja','bolsa','kg','gr']

const emptyForm = {
  nombre: '', categoria: 'Flores artificiales', unidad: 'unidad',
  stock_actual: '', stock_minimo: '', costo_unitario: '', notas: ''
}

export default function Materiales() {
  const [materiales, setMateriales] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [filterCat,  setFilterCat]  = useState('todas')
  const [modal,      setModal]      = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [form,       setForm]       = useState(emptyForm)
  const [saving,     setSaving]     = useState(false)

  useEffect(() => { fetchMateriales() }, [])

  async function fetchMateriales() {
    setLoading(true)
    const { data } = await supabase.from('materiales').select('*').order('nombre')
    setMateriales(data || [])
    setLoading(false)
  }

  function openNew() {
    setEditing(null); setForm(emptyForm); setModal(true)
  }

  function openEdit(m) {
    setEditing(m.id)
    setForm({ nombre: m.nombre, categoria: m.categoria, unidad: m.unidad,
              stock_actual: m.stock_actual, stock_minimo: m.stock_minimo,
              costo_unitario: m.costo_unitario, notas: m.notas || '' })
    setModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      ...form,
      stock_actual: Number(form.stock_actual) || 0,
      stock_minimo: Number(form.stock_minimo) || 0,
      costo_unitario: Number(form.costo_unitario) || 0,
    }
    if (editing) await supabase.from('materiales').update(payload).eq('id', editing)
    else         await supabase.from('materiales').insert(payload)
    setSaving(false); setModal(false); fetchMateriales()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este material?')) return
    await supabase.from('materiales').delete().eq('id', id)
    fetchMateriales()
  }

  const categorias = ['todas', ...new Set(materiales.map(m => m.categoria).filter(Boolean))]

  const filtered = materiales.filter(m => {
    const matchSearch = m.nombre?.toLowerCase().includes(search.toLowerCase())
    const matchCat    = filterCat === 'todas' || m.categoria === filterCat
    return matchSearch && matchCat
  })

  const stockBajo   = materiales.filter(m => m.stock_actual <= m.stock_minimo).length
  const totalInvert = materiales.reduce((s, m) => s + (m.stock_actual * m.costo_unitario), 0)

  const f = v => `S/ ${Number(v).toFixed(2)}`

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-700">{materiales.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Total materiales</p>
        </div>
        <div className="card text-center">
          <p className={`text-2xl font-bold ${stockBajo > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{stockBajo}</p>
          <p className="text-xs text-gray-400 mt-0.5">Stock bajo</p>
        </div>
        <div className="card text-center col-span-2">
          <p className="text-2xl font-bold text-pink-600">{f(totalInvert)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Valor en inventario</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {categorias.map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all
                      ${filterCat === c ? 'bg-pink-500 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-pink-300'}`}>
              {c === 'todas' ? 'Todas' : c}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
                   placeholder="Buscar..." className="input-field pl-8 py-2 w-40 text-xs" />
          </div>
          <button onClick={openNew} className="btn-primary text-xs">
            <Plus size={14} /> Agregar
          </button>
        </div>
      </div>

      {/* Grid de materiales */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.length === 0 && (
            <div className="col-span-4 text-center py-12 text-gray-400 text-sm">
              No hay materiales registrados
            </div>
          )}
          {filtered.map(m => {
            const lowStock = m.stock_actual <= m.stock_minimo
            const pctStock = m.stock_minimo > 0 ? Math.min((m.stock_actual / (m.stock_minimo * 3)) * 100, 100) : 50

            return (
              <div key={m.id}
                   className={`card relative overflow-hidden ${lowStock ? 'border-red-200 bg-red-50/30' : ''}`}>
                {lowStock && (
                  <div className="absolute top-2 right-2">
                    <AlertTriangle size={14} className="text-red-400" />
                  </div>
                )}
                <div className="mb-3">
                  <p className="font-medium text-gray-800 text-sm leading-snug pr-4">{m.nombre}</p>
                  <p className="text-xs text-pink-400 mt-0.5">{m.categoria}</p>
                </div>

                {/* Stock bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Stock</span>
                    <span className={`font-semibold ${lowStock ? 'text-red-500' : 'text-gray-600'}`}>
                      {m.stock_actual} {m.unidad}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${lowStock ? 'bg-red-400' : 'bg-emerald-400'}`}
                         style={{ width: `${pctStock}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Mínimo: {m.stock_minimo} {m.unidad}</p>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-400">Costo unitario</p>
                    <p className="text-sm font-semibold text-gray-700">S/ {Number(m.costo_unitario).toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Valor total</p>
                    <p className="text-sm font-semibold text-pink-600">
                      S/ {(m.stock_actual * m.costo_unitario).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-1 mt-3 pt-3 border-t border-gray-100">
                  <button onClick={() => openEdit(m)}
                          className="flex-1 btn-secondary text-xs py-1.5 justify-center">
                    <Pencil size={12} /> Editar
                  </button>
                  <button onClick={() => handleDelete(m.id)}
                          className="btn-danger text-xs py-1.5 px-2">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)}
             title={editing ? 'Editar material' : 'Nuevo material'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del material *</label>
            <input value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))}
                   className="input-field" placeholder="Ej: Rosas eternas rojas" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
              <select value={form.categoria} onChange={e => setForm(p => ({...p, categoria: e.target.value}))}
                      className="select-field">
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unidad</label>
              <select value={form.unidad} onChange={e => setForm(p => ({...p, unidad: e.target.value}))}
                      className="select-field">
                {UNIDADES.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Stock actual</label>
              <input type="number" value={form.stock_actual}
                     onChange={e => setForm(p => ({...p, stock_actual: e.target.value}))}
                     className="input-field" placeholder="0" min="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Stock mínimo</label>
              <input type="number" value={form.stock_minimo}
                     onChange={e => setForm(p => ({...p, stock_minimo: e.target.value}))}
                     className="input-field" placeholder="0" min="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Costo unitario (S/)</label>
              <input type="number" value={form.costo_unitario}
                     onChange={e => setForm(p => ({...p, costo_unitario: e.target.value}))}
                     className="input-field" placeholder="0.00" min="0" step="0.01" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <textarea value={form.notas} onChange={e => setForm(p => ({...p, notas: e.target.value}))}
                      className="input-field resize-none" rows={2} placeholder="Proveedor, detalles..." />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={saving || !form.nombre} className="btn-primary">
              {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
