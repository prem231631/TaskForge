
import {
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

export default function StatCard({
  title,
  value,
  change,
  description,
  icon: Icon,
  positive = true,
}) {
  return (
    <div className="rounded-2xl border border-[#e9e9ef] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">
            {title}
          </p>

          <h3 className="mt-3 text-3xl font-semibold tracking-tight text-[#20202a]">
            {value}
          </h3>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-[#6755e8]">
          <Icon size={21} />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <span
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
            positive
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-red-50 text-red-600'
          }`}
        >
          {positive ? (
            <ArrowUpRight size={13} />
          ) : (
            <ArrowDownRight size={13} />
          )}

          {change}
        </span>

        <span className="text-xs text-gray-400">
          {description}
        </span>
      </div>
    </div>
  )
}
