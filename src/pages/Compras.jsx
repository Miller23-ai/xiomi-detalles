import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import { Plus, Trash2, ShoppingCart, Calendar, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const emptyForm = {
  fecha: format(new Date(), 'yyyy-MM-dd'),
  proveedor: '', notas: ''
}

export default function Compras() {
  const [compras,    setCompras]    = useState([])
  const [materiales, setMateriales] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(false)
  const [viewModal,  setViewModal]  = useState(null)
  const [form,       setForm]       = useState(emptyForm)
  const [items,      setItems]      = useState([{ material_id: '', material_nombre: '', cantidad: 1, costo_unitario: '' }])
  const [saving,     setSaving]     = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase.from('compras').select('*, items_compra(*)').order('fecha', { ascending: false }),
      supabase.from('materiales').select('id, nombre, costo_unitario, unidad').order('nombre'),
    ])
    setCompras(c || [])
    setMateriales(m || [])
    setLoading(false)
  }

  function openNew() {
    setForm(emptyForm)
    setItems([{ material_id: '', material_nombre: '', cantidad: 1, costo_unitario: '' }])
    setModal(true)
  }

  function addItem() {
    setItems(prev => [...prev, { material_id: '', material_nombre: '', cantidad: 1, costo_unitario: '' }])
  }

  function removeItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function updateItem(idx, field, value) {
    setItems(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      if (field === 'material_id') {
        const mat = materiales.find(m => m.id === value)
        if (mat) {
          next[idx].costo_unitario = mat.costo_unitario
          next[idx].material_nombre = mat.nombre
        }
      }
      return next
    })
  }

  const calcTotal = () => items.reduce((s, i) => s + (Number(i.cantidad) * Number(i.costo_unitario || 0)), 0)

  async function handleSave() {
    setSaving(true)
    const total = calcTotal()
    const { data: compra } = await supabase
      .from('compras').insert({ ...form, total }).select().single()

    if (compra) {
      // Insert items
      const itemsToInsert = items
        .filter(i => i.cantidad > 0 && i.costo_unitario > 0)
        .map(i => ({
          compra_id: compra.id,
          material_id: i.material_id || null,
          material_nombre: i.material_nombre || 'Sin especificar',
          cantidad: Number(i.cantidad),
          costo_unitario: Number(i.costo_unitario),
          subtotal: Number(i.cantidad) * Number(i.costo_unitario),
        }))

      if (itemsToInsert.length > 0) {
        await supabase.from('items_compra').insert(itemsToInsert)

        // Update material stock
        for (const item of itemsToInsert) {
          if (item.material_id) {
            const mat = materiales.find(m => m.id === item.material_id)
            if (mat) {
              await supabase.from('materiales')
                .update({ stock_actual: mat.stock_actual + item.cantidad })
                .eq('id', item.material_id)
            }
          }
        }
      }
    }

    setSaving(false); setModal(false); fetchAll()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta compra? (El stock NO se revertirá automáticamente)')) return
    await supabase.from('compras').delete().eq('id', id)
    fetchAll()
  }

  const totalMes = compras
    .filter(c => c.fecha?.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((s, c) => s + c.total, 0)

  const totalGeneral = compras.reduce((s, c) => s + c.total, 0)

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-pink-600">S/ {totalMes.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Compras este mes</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-700">S/ {totalGeneral.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Total histórico</p>
        </div>
        <div className="card text-center col-span-2 md:col-span-1">
          <p className="text-2xl font-bold text-gray-700">{compras.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Registros de compra</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-600">Historial de compras</h2>
        <button onClick={openNew} className="btn-primary text-xs">
          <Plus size={14} /> Registrar compra
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {compras.length === 0 && (
            <div className="card text-center py-12 text-gray-400 text-sm">
              No hay compras registradas
            </div>
          )}
          {compras.map(c => (
            <div key={c.id} className="card flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <ShoppingCart size={18} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-700">
                    {c.proveedor || 'Proveedor no especificado'}
                  </p>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Calendar size={10} />
                    {format(new Date(c.fecha + 'T12:00:00'), 'd MMM yyyy', { locale: es })}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {c.items_compra?.length || 0} materiales
                  {c.notas && ` · ${c.notas}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-700">S/ {Number(c.total).toFixed(2)}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setViewModal(c)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all">
                  <Eye size={14} />
                </button>
                <button onClick={() => handleDelete(c.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Registrar compra de materiales" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
              <input type="date" value={form.fecha}
                     onChange={e => setForm(p => ({...p, fecha: e.target.value}))}
                     className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Proveedor / Tienda</label>
              <input value={form.proveedor} onChange={e => setForm(p => ({...p, proveedor: e.target.value}))}
                     className="input-field" placeholder="Ej: Mercado central" />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Materiales comprados</label>
              <button onClick={addItem} className="btn-secondary text-xs py-1 px-2">
                <Plus size={12} /> Agregar
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-amber-50/50 p-2 rounded-xl">
                  <div className="col-span-5">
                    <select value={item.material_id}
                            onChange={e => updateItem(idx, 'material_id', e.target.value)}
                            className="select-field text-xs py-2">
                      <option value="">Seleccionar material</option>
                      {materiales.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input type="number" value={item.cantidad}
                           onChange={e => updateItem(idx, 'cantidad', e.target.value)}
                           className="input-field text-xs py-2" placeholder="Cant." min="1" />
                  </div>
                  <div className="col-span-3">
                    <input type="number" value={item.costo_unitario}
                           onChange={e => updateItem(idx, 'costo_unitario', e.target.value)}
                           className="input-field text-xs py-2" placeholder="C/u S/" step="0.01" />
                  </div>
                  <div className="col-span-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">
                      S/{(Number(item.cantidad) * Number(item.costo_unitario || 0)).toFixed(2)}
                    </span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl p-3 flex justify-between">
            <span className="text-sm font-medium text-gray-600">Total de compra:</span>
            <span className="text-lg font-bold text-amber-700">S/ {calcTotal().toFixed(2)}</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <textarea value={form.notas} onChange={e => setForm(p => ({...p, notas: e.target.value}))}
                      className="input-field resize-none" rows={2} placeholder="Observaciones..." />
          </div>

          <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-xl">
            💡 Al guardar, el stock de los materiales seleccionados se actualizará automáticamente.
          </p>

          <div className="flex gap-2 justify-end">
            <button onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Guardando...' : 'Registrar compra'}
            </button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title="Detalle de compra">
        {viewModal && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Fecha</p>
                <p className="font-medium">
                  {format(new Date(viewModal.fecha + 'T12:00:00'), 'd MMM yyyy', { locale: es })}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Proveedor</p>
                <p className="font-medium">{viewModal.proveedor || '—'}</p>
              </div>
            </div>
            {viewModal.items_compra?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">MATERIALES</p>
                {viewModal.items_compra.map((item, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-gray-100">
                    <div>
                      <p>{item.material_nombre}</p>
                      <p className="text-xs text-gray-400">{item.cantidad} × S/{item.costo_unitario}</p>
                    </div>
                    <p className="font-medium">S/ {Number(item.subtotal).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-amber-50 rounded-xl p-3 flex justify-between font-bold">
              <span>Total</span>
              <span className="text-amber-700">S/ {Number(viewModal.total).toFixed(2)}</span>
            </div>
            {viewModal.notas && <p className="text-gray-500 text-xs">{viewModal.notas}</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}
