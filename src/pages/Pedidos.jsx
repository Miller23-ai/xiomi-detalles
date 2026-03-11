import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import { Plus, Search, Pencil, Trash2, Phone, ChevronDown, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADOS = ['pendiente', 'en_proceso', 'listo', 'entregado', 'cancelado']
const ESTADO_LABEL = {
  pendiente: 'Pendiente', en_proceso: 'En proceso',
  listo: 'Listo', entregado: 'Entregado', cancelado: 'Cancelado',
}

const emptyForm = {
  cliente_nombre: '', cliente_telefono: '', fecha_pedido: format(new Date(), 'yyyy-MM-dd'),
  fecha_entrega: '', estado: 'pendiente', total: '', adelanto: '0', notas: '',
}

export default function Pedidos() {
  const [pedidos,   setPedidos]   = useState([])
  const [productos, setProductos] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [filterEst, setFilterEst] = useState('todos')
  const [modal,     setModal]     = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [viewModal, setViewModal] = useState(null)
  const [form,      setForm]      = useState(emptyForm)
  const [items,     setItems]     = useState([])
  const [saving,    setSaving]    = useState(false)

  useEffect(() => { fetchPedidos(); fetchProductos() }, [])

  async function fetchPedidos() {
    setLoading(true)
    const { data } = await supabase
      .from('pedidos').select('*, items_pedido(*)')
      .order('created_at', { ascending: false })
    setPedidos(data || [])
    setLoading(false)
  }

  async function fetchProductos() {
    const { data } = await supabase.from('productos').select('id, nombre, precio_venta').eq('activo', true)
    setProductos(data || [])
  }

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setItems([{ producto_id: '', producto_nombre: '', cantidad: 1, precio_unitario: '', notas_personalizacion: '' }])
    setModal(true)
  }

  function openEdit(p) {
    setEditing(p.id)
    setForm({
      cliente_nombre: p.cliente_nombre, cliente_telefono: p.cliente_telefono || '',
      fecha_pedido: p.fecha_pedido, fecha_entrega: p.fecha_entrega || '',
      estado: p.estado, total: p.total, adelanto: p.adelanto, notas: p.notas || '',
    })
    setItems(p.items_pedido?.length
      ? p.items_pedido.map(i => ({ ...i, precio_unitario: i.precio_unitario }))
      : [{ producto_id: '', producto_nombre: '', cantidad: 1, precio_unitario: '', notas_personalizacion: '' }]
    )
    setModal(true)
  }

  function calcTotal() {
    return items.reduce((s, i) => s + (Number(i.cantidad) * Number(i.precio_unitario || 0)), 0)
  }

  function addItem() {
    setItems(prev => [...prev, { producto_id: '', producto_nombre: '', cantidad: 1, precio_unitario: '', notas_personalizacion: '' }])
  }

  function removeItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function updateItem(idx, field, value) {
    setItems(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      // Auto-fill price from product
      if (field === 'producto_id') {
        const prod = productos.find(p => p.id === value)
        if (prod) {
          next[idx].precio_unitario = prod.precio_venta
          next[idx].producto_nombre = prod.nombre
        }
      }
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    const total = calcTotal()
    const payload = {
      ...form,
      total: form.total || total,
      adelanto: Number(form.adelanto) || 0,
    }

    let pedidoId = editing
    if (editing) {
      await supabase.from('pedidos').update(payload).eq('id', editing)
      await supabase.from('items_pedido').delete().eq('pedido_id', editing)
    } else {
      const { data } = await supabase.from('pedidos').insert(payload).select().single()
      pedidoId = data?.id
    }

    // Insert items
    if (pedidoId && items.length > 0) {
      const itemsToInsert = items
        .filter(i => i.precio_unitario > 0 || i.producto_nombre)
        .map(i => ({
          pedido_id: pedidoId,
          producto_id: i.producto_id || null,
          producto_nombre: i.producto_nombre || '',
          cantidad: Number(i.cantidad),
          precio_unitario: Number(i.precio_unitario),
          notas_personalizacion: i.notas_personalizacion || '',
          subtotal: Number(i.cantidad) * Number(i.precio_unitario),
        }))
      if (itemsToInsert.length > 0)
        await supabase.from('items_pedido').insert(itemsToInsert)
    }

    setSaving(false)
    setModal(false)
    fetchPedidos()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este pedido?')) return
    await supabase.from('pedidos').delete().eq('id', id)
    fetchPedidos()
  }

  async function changeEstado(id, estado) {
    await supabase.from('pedidos').update({ estado }).eq('id', id)
    fetchPedidos()
  }

  const filtered = pedidos.filter(p => {
    const matchSearch = p.cliente_nombre?.toLowerCase().includes(search.toLowerCase())
    const matchEst    = filterEst === 'todos' || p.estado === filterEst
    return matchSearch && matchEst
  })

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {['todos', ...ESTADOS].map(e => (
            <button key={e} onClick={() => setFilterEst(e)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all
                      ${filterEst === e ? 'bg-pink-500 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-pink-300'}`}>
              {e === 'todos' ? 'Todos' : ESTADO_LABEL[e]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
                   placeholder="Buscar cliente..." className="input-field pl-8 py-2 w-48 text-xs" />
          </div>
          <button onClick={openNew} className="btn-primary text-xs">
            <Plus size={14} /> Nuevo pedido
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-pink-50/50">
                {['#', 'Cliente', 'Entrega', 'Total', 'Saldo', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Cargando...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">No hay pedidos</td></tr>
              )}
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-pink-50/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-400">#{p.numero_pedido}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-700">{p.cliente_nombre}</p>
                    {p.cliente_telefono && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Phone size={10} />{p.cliente_telefono}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {p.fecha_entrega
                      ? format(new Date(p.fecha_entrega + 'T12:00:00'), 'd MMM yyyy', { locale: es })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-700">S/ {Number(p.total).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    S/ {(Number(p.total) - Number(p.adelanto)).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative inline-block">
                      <select value={p.estado}
                              onChange={e => changeEstado(p.id, e.target.value)}
                              className={`badge-${p.estado} pr-6 appearance-none cursor-pointer text-xs rounded-full`}
                              style={{ paddingLeft: '10px', paddingTop: '4px', paddingBottom: '4px', border: 'none' }}>
                        {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setViewModal(p)}
                              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => openEdit(p)}
                              className="p-1.5 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-lg transition-all">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(p.id)}
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
      </div>

      {/* Form Modal */}
      <Modal open={modal} onClose={() => setModal(false)}
             title={editing ? 'Editar pedido' : 'Nuevo pedido'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Cliente *</label>
              <input value={form.cliente_nombre} onChange={e => setForm(p => ({...p, cliente_nombre: e.target.value}))}
                     className="input-field" placeholder="Nombre del cliente" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
              <input value={form.cliente_telefono} onChange={e => setForm(p => ({...p, cliente_telefono: e.target.value}))}
                     className="input-field" placeholder="999 888 777" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha pedido</label>
              <input type="date" value={form.fecha_pedido} onChange={e => setForm(p => ({...p, fecha_pedido: e.target.value}))}
                     className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha entrega</label>
              <input type="date" value={form.fecha_entrega} onChange={e => setForm(p => ({...p, fecha_entrega: e.target.value}))}
                     className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
              <select value={form.estado} onChange={e => setForm(p => ({...p, estado: e.target.value}))}
                      className="select-field">
                {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Adelanto (S/)</label>
              <input type="number" value={form.adelanto} onChange={e => setForm(p => ({...p, adelanto: e.target.value}))}
                     className="input-field" placeholder="0" min="0" />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Productos del pedido</label>
              <button onClick={addItem} className="btn-secondary text-xs py-1 px-2">
                <Plus size={12} /> Agregar
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-pink-50/50 p-2 rounded-xl">
                  <div className="col-span-5">
                    <select value={item.producto_id}
                            onChange={e => updateItem(idx, 'producto_id', e.target.value)}
                            className="select-field text-xs py-2">
                      <option value="">Producto / detalle</option>
                      {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input type="number" value={item.cantidad}
                           onChange={e => updateItem(idx, 'cantidad', e.target.value)}
                           className="input-field text-xs py-2" placeholder="Cant." min="1" />
                  </div>
                  <div className="col-span-3">
                    <input type="number" value={item.precio_unitario}
                           onChange={e => updateItem(idx, 'precio_unitario', e.target.value)}
                           className="input-field text-xs py-2" placeholder="Precio S/" />
                  </div>
                  <div className="col-span-2 flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">
                      S/{(Number(item.cantidad) * Number(item.precio_unitario || 0)).toFixed(0)}
                    </span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <div className="col-span-12">
                    <input value={item.notas_personalizacion}
                           onChange={e => updateItem(idx, 'notas_personalizacion', e.target.value)}
                           className="input-field text-xs py-1.5" placeholder="Notas de personalización (opcional)" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total display */}
          <div className="bg-pink-50 rounded-xl p-3 flex justify-between items-center">
            <span className="text-sm text-gray-600 font-medium">Total calculado:</span>
            <span className="text-lg font-bold text-pink-600">S/ {calcTotal().toFixed(2)}</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Total final (S/)</label>
            <input type="number" value={form.total}
                   onChange={e => setForm(p => ({...p, total: e.target.value}))}
                   className="input-field" placeholder={`${calcTotal().toFixed(2)} (dejar vacío para usar calculado)`} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <textarea value={form.notas} onChange={e => setForm(p => ({...p, notas: e.target.value}))}
                      className="input-field resize-none" rows={2} placeholder="Instrucciones especiales..." />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear pedido'}
            </button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title="Detalle del pedido">
        {viewModal && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Cliente</p>
                <p className="font-medium">{viewModal.cliente_nombre}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Teléfono</p>
                <p className="font-medium">{viewModal.cliente_telefono || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Estado</p>
                <span className={`badge-${viewModal.estado}`}>{ESTADO_LABEL[viewModal.estado]}</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Entrega</p>
                <p className="font-medium">
                  {viewModal.fecha_entrega
                    ? format(new Date(viewModal.fecha_entrega + 'T12:00:00'), 'd MMM yyyy', { locale: es })
                    : '—'}
                </p>
              </div>
            </div>
            {viewModal.items_pedido?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">PRODUCTOS</p>
                {viewModal.items_pedido.map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <div>
                      <p>{item.producto_nombre || 'Producto'}</p>
                      {item.notas_personalizacion && <p className="text-xs text-gray-400">{item.notas_personalizacion}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">S/ {Number(item.subtotal).toFixed(2)}</p>
                      <p className="text-xs text-gray-400">{item.cantidad} × S/{item.precio_unitario}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-pink-50 rounded-xl p-3 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Total</span>
                <span className="font-bold text-pink-600">S/ {Number(viewModal.total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Adelanto</span>
                <span>S/ {Number(viewModal.adelanto).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-pink-200 pt-1">
                <span>Saldo pendiente</span>
                <span className="text-amber-600">S/ {(Number(viewModal.total) - Number(viewModal.adelanto)).toFixed(2)}</span>
              </div>
            </div>
            {viewModal.notas && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Notas</p>
                <p className="text-gray-700">{viewModal.notas}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
