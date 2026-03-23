import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import { Plus, Pencil, Key, UserX, UserCheck, Shield, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ROL_LABEL = { admin: 'Administrador', vendedor: 'Vendedor', visor: 'Solo lectura' }
const ROL_COLOR = { admin: 'bg-pink-100 text-pink-700', vendedor: 'bg-blue-100 text-blue-700', visor: 'bg-gray-100 text-gray-600' }

async function callAdmin(accion, body = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/admin-users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ accion, ...body }),
  })
  return res.json()
}

export default function Usuarios() {
  const [users,      setUsers]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [modal,      setModal]      = useState(null) // 'crear' | 'password' | 'rol'
  const [selected,   setSelected]   = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [showPass,   setShowPass]   = useState(false)

  const [formCrear,  setFormCrear]  = useState({ email: '', password: '', nombre: '', rol: 'vendedor' })
  const [formPass,   setFormPass]   = useState({ password: '', confirm: '' })
  const [formRol,    setFormRol]    = useState({ nombre: '', rol: 'vendedor' })

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    setError(null)
    const res = await callAdmin('listar')
    if (res.error) { setError(res.error); setLoading(false); return }
    setUsers(res.users || [])
    setLoading(false)
  }

  async function handleCrear() {
    if (!formCrear.email || !formCrear.password || !formCrear.nombre) return
    if (formCrear.password.length < 6) { alert('La contraseña debe tener al menos 6 caracteres'); return }
    setSaving(true)
    const res = await callAdmin('crear', formCrear)
    setSaving(false)
    if (res.error) { alert('Error: ' + res.error); return }
    setModal(null)
    fetchUsers()
  }

  async function handlePassword() {
    if (formPass.password !== formPass.confirm) { alert('Las contraseñas no coinciden'); return }
    if (formPass.password.length < 6) { alert('Mínimo 6 caracteres'); return }
    setSaving(true)
    const res = await callAdmin('cambiar_password', { userId: selected.id, password: formPass.password })
    setSaving(false)
    if (res.error) { alert('Error: ' + res.error); return }
    setModal(null)
    setFormPass({ password: '', confirm: '' })
  }

  async function handleRol() {
    setSaving(true)
    const res = await callAdmin('actualizar_perfil', { userId: selected.id, nombre: formRol.nombre, rol: formRol.rol })
    setSaving(false)
    if (res.error) { alert('Error: ' + res.error); return }
    setModal(null)
    fetchUsers()
  }

  async function handleDesactivar(user) {
    if (!confirm(`¿Desactivar la cuenta de ${user.email}?`)) return
    const res = await callAdmin('desactivar', { userId: user.id })
    if (res.error) { alert('Error: ' + res.error); return }
    fetchUsers()
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="card max-w-lg mx-auto text-center py-10">
      <Shield size={40} className="text-gray-300 mx-auto mb-3" />
      <p className="text-red-600 font-medium text-sm mb-1">Error al cargar usuarios</p>
      <p className="text-gray-400 text-xs mb-4">{error}</p>
      <div className="bg-amber-50 rounded-xl p-4 text-left text-xs text-amber-800">
        <p className="font-semibold mb-2">⚙️ Configuración requerida en Netlify:</p>
        <p className="mb-1">Agrega estas variables de entorno en Netlify → Site settings → Variables:</p>
        <code className="block bg-amber-100 rounded p-2 mt-1 font-mono">
          SUPABASE_URL = https://xxx.supabase.co<br />
          SUPABASE_SERVICE_KEY = eyJhbGci... (service_role)
        </code>
        <p className="mt-2 text-amber-600">
          La service_role key la encuentras en Supabase → Settings → API → service_role
        </p>
      </div>
    </div>
  )

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex-1 mr-4">
          <ShieldCheck size={14} className="inline mr-1" />
          La gestión de usuarios usa una función segura en el servidor. Las contraseñas nunca pasan por el frontend sin cifrar.
        </div>
        <button onClick={() => { setFormCrear({ email: '', password: '', nombre: '', rol: 'vendedor' }); setModal('crear') }}
                className="btn-primary text-xs flex-shrink-0">
          <Plus size={14} /> Nuevo usuario
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-pink-50/50">
              {['Usuario', 'Rol', 'Último acceso', 'Acciones'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-pink-50/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-xs flex-shrink-0">
                      {(u.nombre || u.email)?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{u.nombre || '—'}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROL_COLOR[u.rol] || ROL_COLOR.visor}`}>
                    {ROL_LABEL[u.rol] || u.rol || 'Sin rol'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {u.last_sign_in_at
                    ? format(new Date(u.last_sign_in_at), "d MMM yyyy 'a las' HH:mm", { locale: es })
                    : 'Nunca'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button title="Cambiar rol"
                            onClick={() => { setSelected(u); setFormRol({ nombre: u.nombre || '', rol: u.rol || 'vendedor' }); setModal('rol') }}
                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all">
                      <Pencil size={14} />
                    </button>
                    <button title="Cambiar contraseña"
                            onClick={() => { setSelected(u); setFormPass({ password: '', confirm: '' }); setModal('password') }}
                            className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all">
                      <Key size={14} />
                    </button>
                    {u.activo !== false ? (
                      <button title="Desactivar cuenta" onClick={() => handleDesactivar(u)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        <UserX size={14} />
                      </button>
                    ) : (
                      <span className="text-xs text-red-400 px-2 py-1.5">Inactivo</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Crear */}
      <Modal open={modal === 'crear'} onClose={() => setModal(null)} size="sm" title="Crear nuevo usuario">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo *</label>
            <input value={formCrear.nombre} onChange={e => setFormCrear(p => ({...p, nombre: e.target.value}))}
                   className="input-field" placeholder="María García" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Correo electrónico *</label>
            <input type="email" value={formCrear.email}
                   onChange={e => setFormCrear(p => ({...p, email: e.target.value}))}
                   className="input-field" placeholder="usuario@ejemplo.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña *</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={formCrear.password}
                     onChange={e => setFormCrear(p => ({...p, password: e.target.value}))}
                     className="input-field pr-9" placeholder="Mínimo 6 caracteres" />
              <button onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rol</label>
            <select value={formCrear.rol} onChange={e => setFormCrear(p => ({...p, rol: e.target.value}))}
                    className="select-field">
              <option value="admin">Administrador (acceso total)</option>
              <option value="vendedor">Vendedor (crear pedidos y compras)</option>
              <option value="visor">Solo lectura (ver reportes)</option>
            </select>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1">
            <p><strong>Admin:</strong> Acceso total, puede gestionar usuarios</p>
            <p><strong>Vendedor:</strong> Pedidos, compras, materiales. Sin configuración</p>
            <p><strong>Visor:</strong> Solo consultar reportes y dashboard</p>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
            <button onClick={handleCrear} disabled={saving} className="btn-primary">
              {saving ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Contraseña */}
      <Modal open={modal === 'password'} onClose={() => setModal(null)} size="sm"
             title={`Cambiar contraseña — ${selected?.nombre || selected?.email}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nueva contraseña *</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={formPass.password}
                     onChange={e => setFormPass(p => ({...p, password: e.target.value}))}
                     className="input-field pr-9" placeholder="Mínimo 6 caracteres" />
              <button onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Confirmar contraseña *</label>
            <input type={showPass ? 'text' : 'password'} value={formPass.confirm}
                   onChange={e => setFormPass(p => ({...p, confirm: e.target.value}))}
                   className="input-field" placeholder="Repetir contraseña" />
          </div>
          {formPass.password && formPass.confirm && formPass.password !== formPass.confirm && (
            <p className="text-xs text-red-500">Las contraseñas no coinciden</p>
          )}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
            <button onClick={handlePassword} disabled={saving || !formPass.password} className="btn-primary">
              {saving ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Rol */}
      <Modal open={modal === 'rol'} onClose={() => setModal(null)} size="sm"
             title={`Editar perfil — ${selected?.email}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
            <input value={formRol.nombre} onChange={e => setFormRol(p => ({...p, nombre: e.target.value}))}
                   className="input-field" placeholder="Nombre completo" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rol</label>
            <select value={formRol.rol} onChange={e => setFormRol(p => ({...p, rol: e.target.value}))}
                    className="select-field">
              <option value="admin">Administrador</option>
              <option value="vendedor">Vendedor</option>
              <option value="visor">Solo lectura</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
            <button onClick={handleRol} disabled={saving} className="btn-primary">
              {saving ? 'Guardando...' : 'Actualizar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
