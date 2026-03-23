import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import { Plus, Pencil, Trash2, Search, AlertTriangle, ArrowUpDown, TrendingUp, TrendingDown, RotateCcw } from 'lucide-react'

const UNIDADES   = ['unidad','metro','pliego','rollo','caja','bolsa','kg','gr']
const emptyForm  = { nombre: '', categoria: '', unidad: 'unidad', stock_actual: '', stock_minimo: '', costo_unitario: '', notas: '', es_producto: false, precio_venta: '' }

export default function Materiales() {
  const [materiales,  setMateriales]  = useState([])
  const [categorias,  setCategorias]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [filterCat,   setFilterCat]   = useState('todas')
  const [modal,       setModal]       = useState(false)
  const [editing,     setEditing]     = useState(null)
  const [form,        setForm]        = useState(emptyForm)
  const [saving,      setSaving]      = useState(false)
  // Ajuste de stock
  const [adjModal,    setAdjModal]    = useState(null)  // material seleccionado
  const [adjForm,     setAdjForm]     = useState({ tipo: 'entrada', cantidad: '', motivo: '' })
  const [adjSaving,   setAdjSaving]   = useState(false)
  // Historial de ajustes
  const [histModal,   setHistModal]   = useState(null)
  const [histData,    setHistData]    = useState([])

  useEffect(() => { fetchMateriales(); fetchCategorias() }, [])

  async function fetchMateriales() {
    setLoading(true)
    const { data } = await supabase.from('materiales').select('*').order('nombre')
    setMateriales(data || [])
    setLoading(false)
  }

  async function fetchCategorias() {
    const { data } = await supabase.from('categorias').select('nombre').eq('tipo', 'material').order('nombre')
    setCategorias(data?.map(c => c.nombre) || ['Flores artificiales','Telas y cintas','Complementos','Cajas y empaques','Luces LED','Peluches','Otros'])
  }

  function openNew()  { setEditing(null); setForm({ ...emptyForm, categoria: categorias[0] || '' }); setModal(true) }
  function openEdit(m) {
    setEditing(m.id)
    setForm({ nombre: m.nombre, categoria: m.categoria || '', unidad: m.unidad || 'unidad',
              stock_actual: m.stock_actual, stock_minimo: m.stock_minimo,
              costo_unitario: m.costo_unitario, notas: m.notas || '',
              es_producto: m.es_producto || false, precio_venta: m.precio_venta || '' })
    setModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = { ...form,
      stock_actual: Number(form.stock_actual) || 0,
      stock_minimo: Number(form.stock_minimo) || 0,
      costo_unitario: Number(form.costo_unitario) || 0,
      precio_venta: Number(form.precio_venta) || 0,
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

  async function handleAjuste() {
    if (!adjForm.cantidad || Number(adjForm.cantidad) <= 0) return
    setAdjSaving(true)
    const mat = adjModal
    const stockAntes  = Number(mat.stock_actual)
    let   stockDespues = stockAntes

    if (adjForm.tipo === 'entrada') {
      stockDespues = stockAntes + Number(adjForm.cantidad)
    } else if (adjForm.tipo === 'salida') {
      stockDespues = Math.max(0, stockAntes - Number(adjForm.cantidad))
    } else {
      stockDespues = Number(adjForm.cantidad) // corrección directa
    }

    await supabase.from('materiales').update({ stock_actual: stockDespues }).eq('id', mat.id)
    await supabase.from('ajustes_stock').insert({
      material_id:   mat.id,
      tipo:          adjForm.tipo,
      cantidad:      Number(adjForm.cantidad),
      motivo:        adjForm.motivo || null,
      stock_antes:   stockAntes,
      stock_despues: stockDespues,
    })

    setAdjSaving(false)
    setAdjModal(null)
    setAdjForm({ tipo: 'entrada', cantidad: '', motivo: '' })
    fetchMateriales()
  }

  async function openHistorial(mat) {
    setHistModal(mat)
    const { data } = await supabase.from('ajustes_stock').select('*')
      .eq('material_id', mat.id).order('created_at', { ascending: false }).limit(30)
    setHistData(data || [])
  }

  const catList  = ['todas', ...new Set([...categorias, ...materiales.map(m => m.categoria).filter(Boolean)])]
  const filtered = materiales.filter(m => {
    const matchSearch = m.nombre?.toLowerCase().includes(search.toLowerCase())
    const matchCat    = filterCat === 'todas' || m.categoria === filterCat
    return matchSearch && matchCat
  })

  const stockBajo   = materiales.filter(m => m.stock_actual <= m.stock_minimo).length
  const totalInvert = materiales.reduce((s, m) => s + (m.stock_actual * m.costo_unitario), 0)
  const vendibles   = materiales.filter(m => m.es_producto).length

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-700">{materiales.length}</p>
          <p className="text-xs text-gray-400">Total materiales</p>
        </div>
        <div className="card text-center">
          <p className={`text-2xl font-bold ${stockBajo > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{stockBajo}</p>
          <p className="text-xs text-gray-400">Stock bajo</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-pink-600">S/ {totalInvert.toFixed(2)}</p>
          <p className="text-xs text-gray-400">Valor en inventario</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-purple-600">{vendibles}</p>
          <p className="text-xs text-gray-400">También son productos</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {catList.map(c => (
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
          <button onClick={openNew} className="btn-primary text-xs"><Plus size={14} /> Agregar</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.length === 0 && (
            <div className="col-span-4 text-center py-12 text-gray-400 text-sm">No hay materiales</div>
          )}
          {filtered.map(m => {
            const lowStock = m.stock_actual <= m.stock_minimo
            const pctStock = m.stock_minimo > 0 ? Math.min((m.stock_actual / (m.stock_minimo * 3)) * 100, 100) : 50
            return (
              <div key={m.id} className={`card relative overflow-hidden ${lowStock ? 'border-red-200 bg-red-50/30' : ''}`}>
                {lowStock && <div className="absolute top-2 right-2"><AlertTriangle size={14} className="text-red-400" /></div>}
                {m.es_producto && (
                  <div className="absolute top-2 left-2">
                    <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                      También producto
                    </span>
                  </div>
                )}
                <div className={`mb-3 ${m.es_producto ? 'mt-6' : ''}`}>
                  <p className="font-medium text-gray-800 text-sm leading-snug">{m.nombre}</p>
                  <p className="text-xs text-pink-400 mt-0.5">{m.categoria}</p>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Stock</span>
                    <span className={`font-semibold ${lowStock ? 'text-red-500' : 'text-gray-600'}`}>
                      {m.stock_actual} {m.unidad}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${lowStock ? 'bg-red-400' : 'bg-emerald-400'}`}
                         style={{ width: `${pctStock}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Mínimo: {m.stock_minimo} {m.unidad}</p>
                </div>

                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="text-xs text-gray-400">Costo unit.</p>
                    <p className="text-sm font-semibold text-gray-700">S/ {Number(m.costo_unitario).toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Valor total</p>
                    <p className="text-sm font-semibold text-pink-600">S/ {(m.stock_actual * m.costo_unitario).toFixed(2)}</p>
                  </div>
                </div>

                {m.es_producto && (
                  <div className="bg-purple-50 rounded-lg px-2 py-1.5 mb-3">
                    <p className="text-xs text-purple-600">Precio venta: <span className="font-semibold">S/ {Number(m.precio_venta || 0).toFixed(2)}</span></p>
                  </div>
                )}

                <div className="flex gap-1 pt-3 border-t border-gray-100">
                  <button onClick={() => { setAdjModal(m); setAdjForm({ tipo: 'entrada', cantidad: '', motivo: '' }) }}
                          className="flex-1 btn-secondary text-xs py-1.5 justify-center" title="Ajustar stock">
                    <ArrowUpDown size={12} /> Ajustar
                  </button>
                  <button onClick={() => openHistorial(m)}
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg" title="Historial">
                    <RotateCcw size={13} />
                  </button>
                  <button onClick={() => openEdit(m)} className="p-1.5 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-lg">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(m.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Form Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar material' : 'Nuevo material'} size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))}
                   className="input-field" placeholder="Ej: Peluche Stitch mediano" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
              <select value={form.categoria} onChange={e => setForm(p => ({...p, categoria: e.target.value}))} className="select-field">
                {categorias.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unidad</label>
              <select value={form.unidad} onChange={e => setForm(p => ({...p, unidad: e.target.value}))} className="select-field">
                {UNIDADES.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Stock actual</label>
              <input type="number" value={form.stock_actual} onChange={e => setForm(p => ({...p, stock_actual: e.target.value}))}
                     className="input-field" placeholder="0" min="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Stock mínimo</label>
              <input type="number" value={form.stock_minimo} onChange={e => setForm(p => ({...p, stock_minimo: e.target.value}))}
                     className="input-field" placeholder="0" min="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Costo unit. (S/)</label>
              <input type="number" value={form.costo_unitario} onChange={e => setForm(p => ({...p, costo_unitario: e.target.value}))}
                     className="input-field" placeholder="0.00" min="0" step="0.01" />
            </div>
          </div>

          {/* Sección: material también es producto */}
          <div className="border border-purple-200 bg-purple-50/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="es_producto" checked={form.es_producto}
                     onChange={e => setForm(p => ({...p, es_producto: e.target.checked}))}
                     className="rounded w-4 h-4" />
              <div>
                <label htmlFor="es_producto" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Este material también se vende como producto
                </label>
                <p className="text-xs text-gray-400">
                  Ej: peluches, flores sueltas, etc. Se podrá vincular a un producto del catálogo.
                </p>
              </div>
            </div>
            {form.es_producto && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Precio de venta sugerido (S/)</label>
                <input type="number" value={form.precio_venta}
                       onChange={e => setForm(p => ({...p, precio_venta: e.target.value}))}
                       className="input-field" placeholder="0.00" step="0.50" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <textarea value={form.notas} onChange={e => setForm(p => ({...p, notas: e.target.value}))}
                      className="input-field resize-none" rows={2} placeholder="Proveedor, detalles..." />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={saving || !form.nombre} className="btn-primary">
              {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Ajuste Stock Modal */}
      <Modal open={!!adjModal} onClose={() => setAdjModal(null)} size="sm"
             title={`Ajustar stock — ${adjModal?.nombre}`}>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400">Stock actual</p>
            <p className="text-2xl font-bold text-gray-700">{adjModal?.stock_actual} <span className="text-sm font-normal">{adjModal?.unidad}</span></p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Tipo de ajuste</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: 'entrada',    label: 'Entrada',    icon: TrendingUp,   color: 'emerald' },
                { v: 'salida',     label: 'Salida',     icon: TrendingDown, color: 'red' },
                { v: 'correccion', label: 'Corrección', icon: RotateCcw,    color: 'blue' },
              ].map(({ v, label, icon: Icon, color }) => (
                <button key={v} onClick={() => setAdjForm(p => ({...p, tipo: v}))}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition-all
                          ${adjForm.tipo === v
                            ? `border-${color}-400 bg-${color}-50 text-${color}-700`
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {adjForm.tipo === 'correccion' ? 'Nuevo stock total' : 'Cantidad'}
            </label>
            <input type="number" value={adjForm.cantidad}
                   onChange={e => setAdjForm(p => ({...p, cantidad: e.target.value}))}
                   className="input-field" placeholder="0" min="0" step="1" />
            {adjForm.cantidad && adjForm.tipo !== 'correccion' && (
              <p className="text-xs text-gray-400 mt-1">
                Stock resultante: <span className="font-semibold">
                  {adjForm.tipo === 'entrada'
                    ? Number(adjModal?.stock_actual || 0) + Number(adjForm.cantidad)
                    : Math.max(0, Number(adjModal?.stock_actual || 0) - Number(adjForm.cantidad))
                  } {adjModal?.unidad}
                </span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Motivo (opcional)</label>
            <input value={adjForm.motivo} onChange={e => setAdjForm(p => ({...p, motivo: e.target.value}))}
                   className="input-field" placeholder="Ej: Devolución, pérdida, inventario físico..." />
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => setAdjModal(null)} className="btn-secondary">Cancelar</button>
            <button onClick={handleAjuste} disabled={adjSaving || !adjForm.cantidad} className="btn-primary">
              {adjSaving ? 'Guardando...' : 'Aplicar ajuste'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Historial Modal */}
      <Modal open={!!histModal} onClose={() => setHistModal(null)} size="md"
             title={`Historial de stock — ${histModal?.nombre}`}>
        <div className="space-y-2">
          {histData.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">Sin movimientos registrados</p>
          ) : (
            histData.map((a, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl
                ${a.tipo === 'entrada' ? 'bg-emerald-50' : a.tipo === 'salida' ? 'bg-red-50' : 'bg-blue-50'}`}>
                {a.tipo === 'entrada' ? <TrendingUp size={15} className="text-emerald-500 flex-shrink-0" />
                : a.tipo === 'salida'  ? <TrendingDown size={15} className="text-red-500 flex-shrink-0" />
                : <RotateCcw size={15} className="text-blue-500 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700">
                    {a.tipo === 'entrada' ? '+' : a.tipo === 'salida' ? '-' : '='}{a.cantidad} {histModal?.unidad}
                    {a.motivo && <span className="font-normal text-gray-500"> — {a.motivo}</span>}
                  </p>
                  <p className="text-xs text-gray-400">
                    {a.stock_antes} → {a.stock_despues} · {new Date(a.created_at).toLocaleDateString('es-PE')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  )
}
