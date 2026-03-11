import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import { Plus, Pencil, Trash2, Search, Package, Tag } from 'lucide-react'

const CATEGORIAS = ['Ramos', 'Ramos eternos', 'Cajas', 'Cajas LED', 'Combos', 'Personalizados', 'Otros']

const emptyForm = {
  nombre: '', descripcion: '', categoria: 'Ramos',
  precio_venta: '', costo_estimado: '', stock: '0', activo: true
}

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [modal,     setModal]     = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [form,      setForm]      = useState(emptyForm)
  const [saving,    setSaving]    = useState(false)

  useEffect(() => { fetchProductos() }, [])

  async function fetchProductos() {
    setLoading(true)
    const { data } = await supabase.from('productos').select('*').order('nombre')
    setProductos(data || [])
    setLoading(false)
  }

  function openNew()  { setEditing(null); setForm(emptyForm); setModal(true) }
  function openEdit(p) {
    setEditing(p.id)
    setForm({ nombre: p.nombre, descripcion: p.descripcion || '', categoria: p.categoria,
              precio_venta: p.precio_venta, costo_estimado: p.costo_estimado || 0,
              stock: p.stock, activo: p.activo })
    setModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      ...form,
      precio_venta:   Number(form.precio_venta) || 0,
      costo_estimado: Number(form.costo_estimado) || 0,
      stock:          Number(form.stock) || 0,
    }
    if (editing) await supabase.from('productos').update(payload).eq('id', editing)
    else         await supabase.from('productos').insert(payload)
    setSaving(false); setModal(false); fetchProductos()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este producto?')) return
    await supabase.from('productos').delete().eq('id', id)
    fetchProductos()
  }

  const filtered = productos.filter(p =>
    p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    p.categoria?.toLowerCase().includes(search.toLowerCase())
  )

  const margen = p => {
    if (!p.costo_estimado || !p.precio_venta) return null
    return (((p.precio_venta - p.costo_estimado) / p.precio_venta) * 100).toFixed(0)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
                 placeholder="Buscar producto..." className="input-field pl-8 py-2 w-52 text-xs" />
        </div>
        <button onClick={openNew} className="btn-primary text-xs">
          <Plus size={14} /> Nuevo producto
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-700">{productos.filter(p => p.activo).length}</p>
          <p className="text-xs text-gray-400">Productos activos</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-pink-600">
            S/ {productos.length > 0 ? (productos.reduce((s, p) => s + p.precio_venta, 0) / productos.length).toFixed(0) : 0}
          </p>
          <p className="text-xs text-gray-400">Precio promedio</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-700">{productos.reduce((s, p) => s + (p.stock || 0), 0)}</p>
          <p className="text-xs text-gray-400">Productos en stock</p>
        </div>
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 && (
            <div className="col-span-3 card text-center py-12 text-gray-400 text-sm">
              No hay productos registrados
            </div>
          )}
          {filtered.map(p => {
            const mg = margen(p)
            return (
              <div key={p.id} className={`card ${!p.activo ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center flex-shrink-0">
                    <Package size={18} className="text-pink-500" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!p.activo && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactivo</span>
                    )}
                    <span className="text-xs bg-pink-50 text-pink-600 px-2 py-0.5 rounded-full font-medium">
                      {p.categoria}
                    </span>
                  </div>
                </div>

                <h3 className="font-medium text-gray-800 text-sm mb-1">{p.nombre}</h3>
                {p.descripcion && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{p.descripcion}</p>}

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-pink-50 rounded-xl p-2.5">
                    <p className="text-xs text-gray-400">Precio venta</p>
                    <p className="text-base font-bold text-pink-600">S/ {Number(p.precio_venta).toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2.5">
                    <p className="text-xs text-gray-400">Costo est.</p>
                    <p className="text-base font-bold text-gray-600">S/ {Number(p.costo_estimado || 0).toFixed(2)}</p>
                  </div>
                </div>

                {mg !== null && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Margen</span>
                      <span className={`font-semibold ${Number(mg) >= 40 ? 'text-emerald-500' : Number(mg) >= 20 ? 'text-amber-500' : 'text-red-500'}`}>
                        {mg}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className={`h-full rounded-full ${Number(mg) >= 40 ? 'bg-emerald-400' : Number(mg) >= 20 ? 'bg-amber-400' : 'bg-red-400'}`}
                           style={{ width: `${Math.min(Number(mg), 100)}%` }} />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                  <span>Stock: <span className="font-medium text-gray-600">{p.stock || 0} uds.</span></span>
                </div>

                <div className="flex gap-1 pt-3 border-t border-gray-100">
                  <button onClick={() => openEdit(p)} className="flex-1 btn-secondary text-xs py-1.5 justify-center">
                    <Pencil size={12} /> Editar
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="btn-danger text-xs py-1.5 px-2">
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
             title={editing ? 'Editar producto' : 'Nuevo producto'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))}
                   className="input-field" placeholder="Ej: Ramo 25 rosas eternas" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
            <textarea value={form.descripcion} onChange={e => setForm(p => ({...p, descripcion: e.target.value}))}
                      className="input-field resize-none" rows={2}
                      placeholder="Qué incluye este detalle..." />
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Stock disponible</label>
              <input type="number" value={form.stock}
                     onChange={e => setForm(p => ({...p, stock: e.target.value}))}
                     className="input-field" min="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Precio de venta (S/) *</label>
              <input type="number" value={form.precio_venta}
                     onChange={e => setForm(p => ({...p, precio_venta: e.target.value}))}
                     className="input-field" placeholder="0.00" step="0.50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Costo estimado (S/)</label>
              <input type="number" value={form.costo_estimado}
                     onChange={e => setForm(p => ({...p, costo_estimado: e.target.value}))}
                     className="input-field" placeholder="0.00" step="0.50" />
            </div>
          </div>

          {form.precio_venta && form.costo_estimado && (
            <div className="bg-emerald-50 rounded-xl p-3 text-sm">
              <p className="text-gray-600">
                Ganancia por venta:
                <span className="font-bold text-emerald-600 ml-2">
                  S/ {(Number(form.precio_venta) - Number(form.costo_estimado)).toFixed(2)}
                </span>
                <span className="text-gray-400 ml-2">
                  ({(((Number(form.precio_venta) - Number(form.costo_estimado)) / Number(form.precio_venta)) * 100).toFixed(0)}% margen)
                </span>
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input type="checkbox" id="activo" checked={form.activo}
                   onChange={e => setForm(p => ({...p, activo: e.target.checked}))}
                   className="rounded" />
            <label htmlFor="activo" className="text-xs text-gray-600">Producto activo (disponible para pedidos)</label>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={saving || !form.nombre || !form.precio_venta} className="btn-primary">
              {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
