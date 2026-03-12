import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import { Plus, Pencil, Trash2, Search, Package, Upload, Image, X } from 'lucide-react'

const emptyForm = {
  nombre: '', descripcion: '', categoria: '',
  precio_venta: '', costo_estimado: '', stock: '0', activo: true, photo_url: ''
}

export default function Productos() {
  const [productos,  setProductos]  = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [modal,      setModal]      = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [form,       setForm]       = useState(emptyForm)
  const [saving,     setSaving]     = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const [photoFile,  setPhotoFile]  = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const fileRef = useRef()

  useEffect(() => { fetchProductos(); fetchCategorias() }, [])

  async function fetchProductos() {
    setLoading(true)
    const { data } = await supabase.from('productos').select('*').order('nombre')
    setProductos(data || [])
    setLoading(false)
  }

  async function fetchCategorias() {
    const { data } = await supabase.from('categorias').select('nombre').eq('tipo', 'producto').order('nombre')
    setCategorias(data?.map(c => c.nombre) || ['Ramos','Ramos eternos','Cajas','Cajas LED','Combos','Personalizados','Otros'])
  }

  function openNew() {
    setEditing(null)
    setForm({ ...emptyForm, categoria: categorias[0] || '' })
    setPhotoFile(null); setPhotoPreview(null)
    setModal(true)
  }

  function openEdit(p) {
    setEditing(p.id)
    setForm({
      nombre: p.nombre, descripcion: p.descripcion || '', categoria: p.categoria || '',
      precio_venta: p.precio_venta, costo_estimado: p.costo_estimado || 0,
      stock: p.stock, activo: p.activo, photo_url: p.photo_url || ''
    })
    setPhotoFile(null)
    setPhotoPreview(p.photo_url || null)
    setModal(true)
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('La foto no puede superar 5MB'); return }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function removePhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)
    setForm(p => ({...p, photo_url: ''}))
    if (fileRef.current) fileRef.current.value = ''
  }

  async function uploadPhoto(productoId) {
    if (!photoFile) return form.photo_url || null
    setUploading(true)
    const ext  = photoFile.name.split('.').pop()
    const path = `${productoId}.${ext}`
    const { error } = await supabase.storage.from('productos').upload(path, photoFile, { upsert: true })
    if (error) { console.error('Upload error:', error); setUploading(false); return form.photo_url || null }
    const { data: { publicUrl } } = supabase.storage.from('productos').getPublicUrl(path)
    setUploading(false)
    return publicUrl
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      ...form,
      precio_venta:   Number(form.precio_venta) || 0,
      costo_estimado: Number(form.costo_estimado) || 0,
      stock:          Number(form.stock) || 0,
    }

    let productoId = editing
    if (editing) {
      await supabase.from('productos').update(payload).eq('id', editing)
    } else {
      const { data } = await supabase.from('productos').insert(payload).select().single()
      productoId = data?.id
    }

    // Upload photo if selected
    if (productoId && photoFile) {
      const photoUrl = await uploadPhoto(productoId)
      if (photoUrl) await supabase.from('productos').update({ photo_url: photoUrl }).eq('id', productoId)
    }

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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
                 placeholder="Buscar producto..." className="input-field pl-8 py-2 w-52 text-xs" />
        </div>
        <button onClick={openNew} className="btn-primary text-xs">
          <Plus size={14} /> Nuevo producto
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-700">{productos.filter(p => p.activo).length}</p>
          <p className="text-xs text-gray-400">Activos</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-pink-600">
            S/ {productos.length > 0 ? (productos.reduce((s, p) => s + p.precio_venta, 0) / productos.length).toFixed(0) : 0}
          </p>
          <p className="text-xs text-gray-400">Precio promedio</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-700">{productos.reduce((s, p) => s + (p.stock || 0), 0)}</p>
          <p className="text-xs text-gray-400">En stock</p>
        </div>
      </div>

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
              <div key={p.id} className={`card overflow-hidden ${!p.activo ? 'opacity-60' : ''}`}>
                {/* Product photo */}
                <div className="relative -mx-5 -mt-5 mb-4 h-40 bg-pink-50 overflow-hidden">
                  {p.photo_url ? (
                    <img src={p.photo_url} alt={p.nombre}
                         className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image size={40} className="text-pink-200" />
                    </div>
                  )}
                  {!p.activo && (
                    <span className="absolute top-2 right-2 text-xs bg-gray-800/70 text-white px-2 py-0.5 rounded-full">
                      Inactivo
                    </span>
                  )}
                  <span className="absolute top-2 left-2 text-xs bg-pink-500 text-white px-2 py-0.5 rounded-full font-medium">
                    {p.categoria}
                  </span>
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
                      <span className="text-gray-400">Margen de ganancia</span>
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

                <p className="text-xs text-gray-400 mb-3">
                  Stock: <span className="font-medium text-gray-600">{p.stock || 0} uds.</span>
                </p>

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
             title={editing ? 'Editar producto' : 'Nuevo producto'} size="lg">
        <div className="space-y-4">
          {/* Photo upload */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Foto del producto</label>
            <div className="relative">
              {photoPreview ? (
                <div className="relative w-full h-40 rounded-xl overflow-hidden bg-pink-50">
                  <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                  <button onClick={removePhoto}
                          className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()}
                        className="w-full h-32 border-2 border-dashed border-pink-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-pink-50 transition-colors cursor-pointer">
                  <Upload size={20} className="text-pink-300" />
                  <p className="text-xs text-gray-400">Clic para subir foto (máx. 5MB)</p>
                  <p className="text-xs text-gray-300">JPG, PNG, WEBP</p>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                     className="hidden" onChange={handlePhotoChange} />
            </div>
            {!photoPreview && (
              <p className="text-xs text-gray-400 mt-1">
                💡 Las fotos se guardan en Supabase Storage (gratis hasta 1GB). No afecta el límite de Netlify.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))}
                   className="input-field" placeholder="Ej: Ramo 25 rosas eternas" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
            <textarea value={form.descripcion} onChange={e => setForm(p => ({...p, descripcion: e.target.value}))}
                      className="input-field resize-none" rows={2} placeholder="Qué incluye este detalle..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Categoría
                <a href="/categorias" className="ml-2 text-pink-500 text-xs font-normal hover:underline">+ gestionar</a>
              </label>
              <select value={form.categoria} onChange={e => setForm(p => ({...p, categoria: e.target.value}))}
                      className="select-field">
                {categorias.map(c => <option key={c}>{c}</option>)}
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
              <span className="text-gray-600">Ganancia por venta: </span>
              <span className="font-bold text-emerald-600 ml-1">
                S/ {(Number(form.precio_venta) - Number(form.costo_estimado)).toFixed(2)}
              </span>
              <span className="text-gray-400 ml-2">
                ({(((Number(form.precio_venta) - Number(form.costo_estimado)) / Number(form.precio_venta)) * 100).toFixed(0)}%)
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input type="checkbox" id="activo" checked={form.activo}
                   onChange={e => setForm(p => ({...p, activo: e.target.checked}))} className="rounded" />
            <label htmlFor="activo" className="text-xs text-gray-600">Producto activo</label>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={saving || uploading || !form.nombre || !form.precio_venta}
                    className="btn-primary">
              {saving || uploading ? 'Guardando...' : editing ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
