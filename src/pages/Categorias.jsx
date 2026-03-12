import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import { Plus, Pencil, Trash2, Tag, Package, Flower2 } from 'lucide-react'

const emptyForm = { nombre: '', tipo: 'producto', color: '#f43f8a' }

const COLORES = [
  '#f43f8a','#f59e0b','#10b981','#3b82f6','#8b5cf6',
  '#ef4444','#ec4899','#14b8a6','#f97316','#6366f1',
]

export default function Categorias() {
  const [categorias, setCategorias] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [form,       setForm]       = useState(emptyForm)
  const [saving,     setSaving]     = useState(false)
  const [tab,        setTab]        = useState('producto')

  useEffect(() => { fetchCategorias() }, [])

  async function fetchCategorias() {
    setLoading(true)
    const { data } = await supabase.from('categorias').select('*').order('tipo').order('nombre')
    setCategorias(data || [])
    setLoading(false)
  }

  function openNew(tipo = tab) {
    setEditing(null)
    setForm({ ...emptyForm, tipo })
    setModal(true)
  }

  function openEdit(c) {
    setEditing(c.id)
    setForm({ nombre: c.nombre, tipo: c.tipo, color: c.color || '#f43f8a' })
    setModal(true)
  }

  async function handleSave() {
    if (!form.nombre.trim()) return
    setSaving(true)
    if (editing) {
      await supabase.from('categorias').update(form).eq('id', editing)
    } else {
      await supabase.from('categorias').insert(form)
    }
    setSaving(false); setModal(false); fetchCategorias()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta categoría? Los productos/materiales que la usan no se verán afectados.')) return
    await supabase.from('categorias').delete().eq('id', id)
    fetchCategorias()
  }

  const catProductos  = categorias.filter(c => c.tipo === 'producto')
  const catMateriales = categorias.filter(c => c.tipo === 'material')
  const shown         = tab === 'producto' ? catProductos : catMateriales

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 text-sm text-pink-700 flex items-start gap-2">
        <Tag size={16} className="mt-0.5 flex-shrink-0" />
        <p>Las categorías se usan al crear <strong>Productos</strong> y <strong>Materiales</strong>.
          Puedes agregar, editar o eliminar las que necesites.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setTab('producto')}
                  className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-medium transition-all
                    ${tab === 'producto' ? 'bg-pink-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-pink-300'}`}>
            <Package size={15} /> Productos ({catProductos.length})
          </button>
          <button onClick={() => setTab('material')}
                  className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-medium transition-all
                    ${tab === 'material' ? 'bg-pink-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-pink-300'}`}>
            <Flower2 size={15} /> Materiales ({catMateriales.length})
          </button>
        </div>
        <button onClick={() => openNew(tab)} className="btn-primary text-xs">
          <Plus size={14} /> Nueva categoría
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {shown.length === 0 && (
            <div className="col-span-5 card text-center py-12 text-gray-400 text-sm">
              No hay categorías de {tab === 'producto' ? 'productos' : 'materiales'}. ¡Agrega la primera!
            </div>
          )}
          {shown.map(cat => (
            <div key={cat.id} className="card flex flex-col items-center text-center gap-3 py-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                   style={{ background: `${cat.color || '#f43f8a'}22` }}>
                <Tag size={22} style={{ color: cat.color || '#f43f8a' }} />
              </div>
              <p className="text-sm font-medium text-gray-700 leading-snug">{cat.nombre}</p>
              <div className="flex gap-1 mt-auto">
                <button onClick={() => openEdit(cat)}
                        className="p-1.5 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-lg transition-all">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(cat.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {/* Quick add card */}
          <button onClick={() => openNew(tab)}
                  className="card flex flex-col items-center text-center gap-2 py-5 border-dashed border-2 border-gray-200 hover:border-pink-300 hover:bg-pink-50/30 transition-all cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Plus size={22} className="text-gray-400" />
            </div>
            <p className="text-xs text-gray-400 font-medium">Agregar</p>
          </button>
        </div>
      )}

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} size="sm"
             title={editing ? 'Editar categoría' : 'Nueva categoría'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))}
                   className="input-field" placeholder="Ej: Ramos especiales" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
            <select value={form.tipo} onChange={e => setForm(p => ({...p, tipo: e.target.value}))}
                    className="select-field">
              <option value="producto">Categoría de producto</option>
              <option value="material">Categoría de material</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORES.map(c => (
                <button key={c} onClick={() => setForm(p => ({...p, color: c}))}
                        className={`w-8 h-8 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
                        style={{ background: c }} />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: `${form.color}22` }}>
              <Tag size={18} style={{ color: form.color }} />
            </div>
            <p className="text-sm font-medium text-gray-700">{form.nombre || 'Vista previa'}</p>
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={saving || !form.nombre.trim()} className="btn-primary">
              {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
