import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Gift, Heart, Lock, Mail, AlertCircle } from 'lucide-react'

export default function Login() {
  const { signIn } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) setError('Correo o contraseña incorrectos.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fdf4ff 100%)' }}>
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-center items-center w-1/2 relative overflow-hidden"
           style={{ background: 'linear-gradient(160deg, #1a0a10 0%, #3d0a22 60%, #7d0d45 100%)' }}>
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, #f43f8a, transparent)', transform: 'translate(40%, -40%)' }} />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, #f43f8a, transparent)', transform: 'translate(-40%, 40%)' }} />

        <div className="relative z-10 text-center px-12">
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #f43f8a, #a8155a)' }}>
              <Gift size={40} className="text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-display text-white mb-4">Xiomi Detalles</h1>
          <p className="text-pink-300/70 text-lg leading-relaxed">
            Tu sistema completo de gestión<br />para detalles personalizados
          </p>

          <div className="mt-12 grid grid-cols-2 gap-4">
            {[
              { label: 'Pedidos', icon: '📦' },
              { label: 'Inventario', icon: '🌸' },
              { label: 'Compras', icon: '🛍️' },
              { label: 'Finanzas', icon: '💰' },
            ].map(item => (
              <div key={item.label}
                   className="bg-white/5 backdrop-blur rounded-xl p-4 border border-pink-500/20 text-left">
                <span className="text-2xl">{item.icon}</span>
                <p className="text-pink-200 text-sm font-medium mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg, #f43f8a, #a8155a)' }}>
                <Gift size={24} className="text-white" />
              </div>
              <div>
                <h2 className="font-display text-xl text-gray-800">Xiomi Detalles</h2>
                <p className="text-xs text-gray-400">Sistema de Gestión</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8 border border-pink-100">
            <div className="mb-8">
              <h2 className="text-2xl font-display text-gray-800 mb-1">Bienvenida 💕</h2>
              <p className="text-gray-400 text-sm">Ingresa tus credenciales para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Correo electrónico</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-field pl-9"
                    placeholder="tu@correo.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Contraseña</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-field pl-9"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm px-3 py-2.5 rounded-xl border border-red-100">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                style={{ background: loading ? '#f9a8d4' : 'linear-gradient(135deg, #f43f8a, #a8155a)' }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Heart size={16} />
                    Ingresar
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-gray-400 text-xs mt-6">
            ¿Problemas para ingresar? Contacta al administrador.
          </p>
        </div>
      </div>
    </div>
  )
}
