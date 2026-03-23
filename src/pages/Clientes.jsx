import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import { Plus, Pencil, Trash2, Search, Phone, Mail, Eye, TrendingUp, Package, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const emptyForm = { nombre: '', telefono: '', email: '', direccion: '', notas: '' }

const ESTADO_LABEL = { pendiente: 'Pendiente', en_proceso: 'En proceso', listo: 'Listo', entregado: 'Entregado', cancelado: 'Cancelado' }

export default function Clientes() {
  const [clientes,   setClientes]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [modal,      setModal]      = useState(false)
  const [histModal,  setHistModal]  = useState(null)
  const [editing,    setEditing]    = useState(null)
  const [form,       setForm]       = useState(emptyForm)
  const [saving,     setSaving]     = useState(false)
  const [histData,   setHistData]   = useState({ pedidos: [], stats: {} })
  const [histLoad,   setHistLoad]   = useState(false)

  useEffect(() => { fetchClientes() }, [])

  async function fetchClientes() {
    setLoading(true)
    const { data } = await supabase
      .from('clientes').select('*').order('nombre')
    setClientes(data || [])
    setLoading(false)
  }

  function openNew()   { setEditing(null); setForm(emptyForm); setModal(true) }
  function openEdit(c) { setEditing(c.id); setForm({ nombre: c.nombre, telefono: c.telefono || '', email: c.email || '', direccion: c.direccion || '', notas: c.notas || '' }); setModal(true) }

  async function handleSave() {
    setSaving(true)
    if (editing) await supabase.from('clientes').update(form).eq('id', editing)
    else         await supabase.from('clientes').insert(form)
    setSaving(false); setModal(false); fetchClientes()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar cliente? Sus pedidos no se eliminarán pero quedarán sin cliente asignado.')) return
    await supabase.from('clientes').delete().eq('id', id)
    fetchClientes()
  }

  async function openHistorial(cliente) {
    setHistModal(cliente)
    setHistLoad(true)
    const { data: pedidos } = await supabase
      .from('pedidos').select('*, items_pedido(*)')
      .eq('cliente_id', cliente.id)
      .order('created_at', { ascending: false })

    const p = pedidos || []
    const totalGastado   = p.filter(x => x.estado === 'entregado').reduce((s, x) => s + Number(x.total), 0)
    const totalPedidos   = p.length
    const pedidosEntregados = p.filter(x => x.estado === 'entregado').length
    const ultimoPedido   = p[0]?.fecha_pedido

    setHistData({ pedidos: p, stats: { totalGastado, totalPedidos, pedidosEntregados, ultimoPedido } })
    setHistLoad(false)
  }

  const filtered = clientes.filter(c =>
    c.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    c.telefono?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-700">{clientes.length}</p>
          <p className="text-xs text-gray-400">Total clientes</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-pink-600">{clientes.filter(c => c.activo).length}</p>
          <p className="text-xs text-gray-400">Activos</p>
        </div>
        <div className="card text-center col-span-2 md:col-span-1">
          <p className="text-2xl font-bold text-gray-700">
            {clientes.filter(c => {
              const d = new Date(c.created_at)
              const now = new Date()
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
            }).length}
          </p>
          <p className="text-xs text-gray-400">Nuevos este mes</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
                 placeholder="Buscar cliente..." className="input-field pl-8 py-2 w-52 text-xs" />
        </div>
        <button onClick={openNew} className="btn-primary text-xs">
          <Plus size={14} /> Nuevo cliente
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-pink-50/50">
                {['Cliente', 'Contacto', 'Miembro desde', 'Acciones'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="text-center py-12 text-gray-400 text-sm">No hay clientes</td></tr>
              )}
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-pink-50/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-sm flex-shrink-0">
                        {c.nombre?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">{c.nombre}</p>
                        {c.notas && <p className="text-xs text-gray-400 line-clamp-1">{c.notas}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.telefono && (
                      <p className="text-xs text-gray-600 flex items-center gap-1 mb-0.5">
                        <Phone size={10} />{c.telefono}
                      </p>
                    )}
                    {c.email && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Mail size={10} />{c.email}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {format(new Date(c.created_at), 'd MMM yyyy', { locale: es })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openHistorial(c)}
                              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Ver historial">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => openEdit(c)}
                              className="p-1.5 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-lg transition-all">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(c.id)}
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

      {/* Form Modal */}
      <Modal open={modal} onClose={() => setModal(false)} size="sm" title={editing ? 'Editar cliente' : 'Nuevo cliente'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))}
                   className="input-field" placeholder="Nombre completo" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
              <input value={form.telefono} onChange={e => setForm(p => ({...p, telefono: e.target.value}))}
                     className="input-field" placeholder="999 888 777" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))}
                     className="input-field" placeholder="correo@ejemplo.com" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label>
            <input value={form.direccion} onChange={e => setForm(p => ({...p, direccion: e.target.value}))}
                   className="input-field" placeholder="Dirección de entrega habitual" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <textarea value={form.notas} onChange={e => setForm(p => ({...p, notas: e.target.value}))}
                      className="input-field resize-none" rows={2} placeholder="Preferencias, cumpleaños, etc." />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={saving || !form.nombre} className="btn-primary">
              {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Historial Modal */}
      <Modal open={!!histModal} onClose={() => setHistModal(null)} size="xl"
             title={`Historial — ${histModal?.nombre}`}>
        {histLoad ? (
          <div className="flex justify-center py-8">
            <div className="w-7 h-7 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Stats del cliente */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-pink-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-pink-600">{histData.stats.totalPedidos}</p>
                <p className="text-xs text-gray-400">Total pedidos</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-emerald-600">{histData.stats.pedidosEntregados}</p>
                <p className="text-xs text-gray-400">Entregados</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-amber-600">S/ {Number(histData.stats.totalGastado || 0).toFixed(2)}</p>
                <p className="text-xs text-gray-400">Total gastado</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-gray-600">
                  S/ {histData.stats.pedidosEntregados > 0
                    ? (histData.stats.totalGastado / histData.stats.pedidosEntregados).toFixed(2)
                    : '0.00'}
                </p>
                <p className="text-xs text-gray-400">Ticket promedio</p>
              </div>
            </div>

            {/* Contacto */}
            <div className="flex gap-3 flex-wrap">
              {histModal?.telefono && (
                <a href={`https://wa.me/51${histModal.telefono.replace(/\D/g,'')}`}
                   target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-1.5 text-xs bg-green-50 text-green-600 px-3 py-1.5 rounded-full border border-green-200 hover:bg-green-100">
                  <Phone size={12} /> {histModal.telefono} — WhatsApp
                </a>
              )}
              {histModal?.email && (
                <span className="flex items-center gap-1.5 text-xs bg-gray-50 text-gray-600 px-3 py-1.5 rounded-full border border-gray-200">
                  <Mail size={12} /> {histModal.email}
                </span>
              )}
            </div>

            {/* Lista de pedidos */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-3">PEDIDOS</p>
              {histData.pedidos.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-6">Sin pedidos registrados</p>
              ) : (
                <div className="space-y-2">
                  {histData.pedidos.map(p => (
                    <div key={p.id} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">#{p.numero_pedido}</span>
                          <span className={`badge-${p.estado}`}>{ESTADO_LABEL[p.estado]}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-700">S/ {Number(p.total).toFixed(2)}</p>
                          <p className="text-xs text-gray-400">
                            {format(new Date(p.fecha_pedido + 'T12:00:00'), 'd MMM yyyy', { locale: es })}
                          </p>
                        </div>
                      </div>
                      {p.items_pedido?.length > 0 && (
                        <div className="text-xs text-gray-500 space-y-0.5">
                          {p.items_pedido.map((item, i) => (
                            <p key={i}>• {item.producto_nombre} × {item.cantidad} — S/ {Number(item.subtotal).toFixed(2)}</p>
                          ))}
                        </div>
                      )}
                      {p.notas && <p className="text-xs text-gray-400 mt-1 italic">{p.notas}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
