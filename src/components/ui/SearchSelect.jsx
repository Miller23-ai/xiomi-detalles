import { useState, useRef, useEffect } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'

/**
 * SearchSelect - Combobox con búsqueda dinámica
 * Props:
 *   options: [{id, label, sub?, precio?}]
 *   value: id seleccionado
 *   onChange: (id, option) => void
 *   placeholder: string
 *   allowFreeText: bool — permite escribir texto libre (sin seleccionar opción)
 *   onFreeText: (text) => void — callback cuando se escribe libre
 *   freeTextValue: string — valor del texto libre actual
 */
export default function SearchSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Buscar...',
  allowFreeText = false,
  onFreeText,
  freeTextValue = '',
  disabled = false,
  className = '',
}) {
  const [open,   setOpen]   = useState(false)
  const [query,  setQuery]  = useState('')
  const inputRef = useRef()
  const wrapRef  = useRef()

  // Etiqueta del elemento seleccionado
  const selected = options.find(o => o.id === value)

  // Filtrar opciones según query
  const filtered = options.filter(o =>
    !query || o.label?.toLowerCase().includes(query.toLowerCase()) ||
              o.sub?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 20)

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handle(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Cuando cambia value externamente, limpiar query
  useEffect(() => {
    if (value && !open) setQuery('')
  }, [value, open])

  function handleOpen() {
    if (disabled) return
    setQuery('')
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleSelect(opt) {
    onChange(opt.id, opt)
    setQuery('')
    setOpen(false)
  }

  function handleClear(e) {
    e.stopPropagation()
    onChange('', null)
    if (allowFreeText && onFreeText) onFreeText('')
    setQuery('')
  }

  function handleInputChange(e) {
    const v = e.target.value
    setQuery(v)
    if (allowFreeText && onFreeText) onFreeText(v)
    if (v) setOpen(true)
  }

  // Texto mostrado cuando está cerrado
  const displayText = allowFreeText
    ? (freeTextValue || selected?.label || '')
    : (selected?.label || '')

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {/* Trigger */}
      {!open ? (
        <div
          onClick={handleOpen}
          className={`input-field flex items-center gap-2 cursor-pointer select-none
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${!displayText ? 'text-gray-400' : 'text-gray-700'}`}
        >
          <Search size={13} className="text-gray-400 flex-shrink-0" />
          <span className="flex-1 truncate text-sm">{displayText || placeholder}</span>
          {displayText ? (
            <button onClick={handleClear} className="text-gray-300 hover:text-gray-500 flex-shrink-0">
              <X size={13} />
            </button>
          ) : (
            <ChevronDown size={13} className="text-gray-400 flex-shrink-0" />
          )}
        </div>
      ) : (
        <input
          ref={inputRef}
          value={query}
          onChange={handleInputChange}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="input-field text-sm"
          autoComplete="off"
        />
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-xs text-gray-400 text-center">
              {allowFreeText
                ? <span>"{query}" — se usará como texto libre</span>
                : 'Sin resultados'}
            </div>
          ) : (
            filtered.map(opt => (
              <button
                key={opt.id}
                onMouseDown={() => handleSelect(opt)}
                className={`w-full text-left px-3 py-2.5 hover:bg-pink-50 transition-colors
                  border-b border-gray-50 last:border-0
                  ${value === opt.id ? 'bg-pink-50' : ''}`}
              >
                <p className="text-sm font-medium text-gray-700">{opt.label}</p>
                {opt.sub && <p className="text-xs text-gray-400">{opt.sub}</p>}
                {opt.precio !== undefined && (
                  <p className="text-xs text-pink-500 font-medium">S/ {Number(opt.precio).toFixed(2)}</p>
                )}
              </button>
            ))
          )}
          {allowFreeText && query && filtered.length > 0 && (
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-400">O presiona Enter para usar "{query}" como texto libre</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
