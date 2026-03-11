export default function StatCard({ label, value, sub, icon: Icon, color = 'pink', trend }) {
  const colors = {
    pink:   { bg: 'bg-pink-50',    icon: 'bg-pink-500',    text: 'text-pink-600' },
    green:  { bg: 'bg-emerald-50', icon: 'bg-emerald-500', text: 'text-emerald-600' },
    amber:  { bg: 'bg-amber-50',   icon: 'bg-amber-500',   text: 'text-amber-600' },
    blue:   { bg: 'bg-blue-50',    icon: 'bg-blue-500',    text: 'text-blue-600' },
    purple: { bg: 'bg-violet-50',  icon: 'bg-violet-500',  text: 'text-violet-600' },
    red:    { bg: 'bg-red-50',     icon: 'bg-red-500',     text: 'text-red-600' },
  }
  const c = colors[color] || colors.pink

  return (
    <div className={`card stat-card flex items-start gap-4`}>
      <div className={`${c.icon} w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        {trend !== undefined && (
          <p className={`text-xs mt-1 font-medium ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs mes anterior
          </p>
        )}
      </div>
    </div>
  )
}
