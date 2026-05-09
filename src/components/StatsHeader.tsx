import { Stats } from '@/lib/types'

export default function StatsHeader({ stats }: { stats: Stats }) {
  const items = [
    { label: 'Schools Tracking', value: stats.total,         color: 'text-blue-700',   bg: 'bg-blue-50' },
    { label: 'Offers',           value: stats.offered,       color: 'text-green-700',  bg: 'bg-green-50' },
    { label: 'A List',           value: stats.a_list,        color: 'text-rose-700',   bg: 'bg-rose-50' },
    { label: 'Upcoming Calls',   value: stats.upcoming_calls,color: 'text-purple-700', bg: 'bg-purple-50' },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {items.map(item => (
        <div key={item.label} className={`${item.bg} rounded-xl border p-4 text-center`}>
          <div className={`text-3xl font-bold ${item.color}`}>{item.value}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">{item.label}</div>
        </div>
      ))}
    </div>
  )
}
