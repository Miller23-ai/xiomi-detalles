import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Save, PiggyBank, MessageCircle, Store, CheckCircle2, Palette } from 'lucide-react'

const PRESET_COLORS = [
  { name: 'Rosa (defecto)', primary: '#f43f8a', secondary: '#a8155a' },
  { name: 'Lila romántico', primary: '#a855f7', secondary: '#7c3aed' },
  { name: 'Rojo pasión',    primary: '#ef4444', secondary: '#b91c1c' },
  { name: 'Coral suave',    primary: '#f97316', secondary: '#c2410c' },
  { name: 'Verde esmeralda',primary: '#10b981', secondary: '#047857' },
  { name: 'Azul cielo',     primary: '#3b82f6', secondary: '#1d4ed8' },
  { name: 'Turquesa',       primary: '#14b8a6', secondary: '#0f766e' },
  { name: 'Dorado',         primary: '#f59e0b', secondary: '#b45309' },
]

export default function Configuracion() {
  const [config,  setConfig]  = useState({})
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

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
    for (const [clave, valor] of Object.entries(config)) {
      await supabase.from('configuracion').upsert({ clave, valor }, { onConflict: 'clave' })
    }
    // Aplicar colores al documento en tiempo real
    document.documentElement.style.setProperty('--color-primary',   config.color_primario   || '#f43f8a')
    document.documentElement.style.setProperty('--color-secondary',  config.color_secundario || '#a8155a')
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000)
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
          <CheckCircle2 size={16} /> Configuración guardada
        </div>
      )}

      {/* Negocio */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-pink-100 flex items-center justify-center">
            <Store size={18} className="text-pink-500" />
          </div>
          <h3 className="font-display text-base text-gray-700">Información del negocio</h3>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del negocio</label>
          <input value={config.negocio_nombre || ''} onChange={e => set('negocio_nombre', e.target.value)}
                 className="input-field" placeholder="Xiomi Detalles" />
        </div>
      </div>

      {/* Colores */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-pink-100 flex items-center justify-center">
            <Palette size={18} className="text-pink-500" />
          </div>
          <div>
            <h3 className="font-display text-base text-gray-700">Colores del sistema</h3>
            <p className="text-xs text-gray-400">Personaliza los colores del panel</p>
          </div>
        </div>

        {/* Presets */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-600 mb-2">Combinaciones predefinidas</p>
          <div className="grid grid-cols-4 gap-2">
            {PRESET_COLORS.map(preset => (
              <button key={preset.name}
                      onClick={() => { set('color_primario', preset.primary); set('color_secundario', preset.secondary) }}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all hover:scale-105
                        ${config.color_primario === preset.primary ? 'border-gray-400' : 'border-transparent hover:border-gray-200'}`}>
                <div className="flex gap-1">
                  <div className="w-6 h-6 rounded-full shadow-sm" style={{ background: preset.primary }} />
                  <div className="w-6 h-6 rounded-full shadow-sm" style={{ background: preset.secondary }} />
                </div>
                <p className="text-xs text-gray-500 text-center leading-tight" style={{ fontSize: '10px' }}>{preset.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Custom pickers */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Color primario</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={config.color_primario || '#f43f8a'}
                     onChange={e => set('color_primario', e.target.value)}
                     className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
              <input value={config.color_primario || '#f43f8a'}
                     onChange={e => set('color_primario', e.target.value)}
                     className="input-field font-mono text-sm" placeholder="#f43f8a" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Color secundario</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={config.color_secundario || '#a8155a'}
                     onChange={e => set('color_secundario', e.target.value)}
                     className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
              <input value={config.color_secundario || '#a8155a'}
                     onChange={e => set('color_secundario', e.target.value)}
                     className="input-field font-mono text-sm" placeholder="#a8155a" />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-4 rounded-xl overflow-hidden border border-gray-100">
          <div className="h-10 flex items-center px-4 gap-2"
               style={{ background: `linear-gradient(135deg, ${config.color_primario||'#f43f8a'}, ${config.color_secundario||'#a8155a'})` }}>
            <div className="w-4 h-4 rounded bg-white/30" />
            <div className="flex-1 h-2 rounded bg-white/20" />
          </div>
          <div className="p-3 bg-gray-50 flex gap-2">
            <button className="text-xs px-3 py-1.5 rounded-lg text-white font-medium"
                    style={{ background: config.color_primario || '#f43f8a' }}>Botón primario</button>
            <button className="text-xs px-3 py-1.5 rounded-lg font-medium border"
                    style={{ color: config.color_primario||'#f43f8a', borderColor: config.color_primario||'#f43f8a', background: `${config.color_primario||'#f43f8a'}15` }}>
              Botón secundario
            </button>
          </div>
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
            <p className="text-xs text-gray-400">El dinero con el que empezaste a registrar</p>
          </div>
        </div>
        <input type="number" value={config.saldo_inicial || '0'}
               onChange={e => set('saldo_inicial', e.target.value)}
               className="input-field text-lg font-semibold" placeholder="0.00" min="0" step="0.50" />
        <p className="text-xs text-blue-600 bg-blue-50 rounded-xl px-3 py-2 mt-3">
          💡 Este valor + ganancias acumuladas = Saldo en caja (Dashboard)
        </p>
      </div>

      {/* WhatsApp */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
            <MessageCircle size={18} className="text-green-500" />
          </div>
          <div>
            <h3 className="font-display text-base text-gray-700">Notificaciones WhatsApp</h3>
            <p className="text-xs text-gray-400">Mensaje al cliente al marcar pedido como listo</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono del negocio</label>
            <div className="flex gap-2">
              <span className="input-field w-14 text-center text-gray-500 bg-gray-50 flex-shrink-0">+51</span>
              <input value={config.whatsapp_telefono || ''}
                     onChange={e => set('whatsapp_telefono', e.target.value.replace(/\D/g,'').slice(0,9))}
                     className="input-field flex-1" placeholder="999 888 777" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mensaje para clientes</label>
            <textarea value={config.whatsapp_mensaje_entrega || ''}
                      onChange={e => set('whatsapp_mensaje_entrega', e.target.value)}
                      className="input-field resize-none font-mono text-xs" rows={4} />
            <div className="mt-2 flex gap-2 flex-wrap">
              {['{cliente}','{total}','{saldo}','{fecha_entrega}'].map(v => (
                <button key={v} onClick={() => set('whatsapp_mensaje_entrega', (config.whatsapp_mensaje_entrega||'')+v)}
                        className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full hover:bg-green-100 border border-green-200">
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-green-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Preview:</p>
            <p className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-white rounded-lg p-2 border border-green-100">
              {(config.whatsapp_mensaje_entrega||'')
                .replace('{cliente}','María García').replace('{total}','46.00')
                .replace('{saldo}','26.00').replace('{fecha_entrega}','14/02/2025')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary px-6">
          <Save size={15} /> {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
    </div>
  )
}
