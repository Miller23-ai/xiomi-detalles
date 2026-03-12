import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Save, PiggyBank, MessageCircle, Store, CheckCircle2 } from 'lucide-react'

export default function Configuracion() {
  const [config,   setConfig]   = useState({})
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)

  useEffect(() => { fetchConfig() }, [])

  async function fetchConfig() {
    setLoading(true)
    const { data } = await supabase.from('configuracion').select('*')
    const map = {}
    ;(data || []).forEach(r => { map[r.clave] = r.valor || '' })
    setConfig(map)
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const entries = Object.entries(config)
    for (const [clave, valor] of entries) {
      await supabase.from('configuracion')
        .upsert({ clave, valor }, { onConflict: 'clave' })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const set = (clave, valor) => setConfig(p => ({...p, [clave]: valor}))

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-2xl space-y-6">

      {saved && (
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-sm px-4 py-3 rounded-xl border border-emerald-200">
          <CheckCircle2 size={16} /> Configuración guardada correctamente
        </div>
      )}

      {/* Negocio */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-pink-100 flex items-center justify-center">
            <Store size={18} className="text-pink-500" />
          </div>
          <div>
            <h3 className="font-display text-base text-gray-700">Información del negocio</h3>
            <p className="text-xs text-gray-400">Aparece en reportes y notificaciones</p>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del negocio</label>
          <input value={config.negocio_nombre || ''}
                 onChange={e => set('negocio_nombre', e.target.value)}
                 className="input-field" placeholder="Xiomi Detalles" />
        </div>
      </div>

      {/* Saldo inicial */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
            <PiggyBank size={18} className="text-emerald-500" />
          </div>
          <div>
            <h3 className="font-display text-base text-gray-700">Saldo inicial de caja</h3>
            <p className="text-xs text-gray-400">El dinero con el que empezaste a usar el sistema</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Saldo inicial (S/)</label>
            <input type="number"
                   value={config.saldo_inicial || '0'}
                   onChange={e => set('saldo_inicial', e.target.value)}
                   className="input-field text-lg font-semibold"
                   placeholder="0.00" min="0" step="0.50" />
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
            💡 Este valor se suma a tu ganancia neta para calcular el <strong>Saldo en caja</strong> que ves en el Dashboard.
            Ponlo en <strong>0</strong> si quieres que el saldo solo refleje ganancias desde que empezaste a registrar.
          </div>
        </div>
      </div>

      {/* WhatsApp */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
            <MessageCircle size={18} className="text-green-500" />
          </div>
          <div>
            <h3 className="font-display text-base text-gray-700">Notificaciones de WhatsApp</h3>
            <p className="text-xs text-gray-400">Mensaje automático al marcar un pedido como listo</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Teléfono del negocio (para recibir pedidos por WhatsApp)
            </label>
            <div className="flex gap-2">
              <span className="input-field w-14 text-center text-gray-500 bg-gray-50">+51</span>
              <input value={config.whatsapp_telefono || ''}
                     onChange={e => set('whatsapp_telefono', e.target.value.replace(/\D/g, '').slice(0, 9))}
                     className="input-field flex-1" placeholder="999 888 777" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Mensaje de WhatsApp al marcar como "Listo"
            </label>
            <textarea value={config.whatsapp_mensaje_entrega || ''}
                      onChange={e => set('whatsapp_mensaje_entrega', e.target.value)}
                      className="input-field resize-none font-mono text-xs" rows={4} />
            <div className="mt-2 flex gap-2 flex-wrap">
              {['{cliente}', '{total}', '{saldo}', '{fecha_entrega}'].map(v => (
                <button key={v}
                        onClick={() => set('whatsapp_mensaje_entrega',
                          (config.whatsapp_mensaje_entrega || '') + v)}
                        className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full hover:bg-green-100 border border-green-200">
                  {v}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Usa las variables de arriba para personalizar el mensaje. Al hacer clic en WhatsApp en un pedido, se abrirá con este mensaje.
            </p>
          </div>

          {/* Preview del botón WhatsApp */}
          <div className="bg-green-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-2">Preview del mensaje (ejemplo):</p>
            <p className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-white rounded-lg p-2 border border-green-100">
              {(config.whatsapp_mensaje_entrega || '')
                .replace('{cliente}', 'María García')
                .replace('{total}', '46.00')
                .replace('{saldo}', '26.00')
                .replace('{fecha_entrega}', '14/02/2025')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary px-6">
          <Save size={15} />
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
    </div>
  )
}
