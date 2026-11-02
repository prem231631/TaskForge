
import {
  CalendarDays,
  Circle,
  CircleDot,
  CheckCircle2,
  MoreHorizontal,
} from 'lucide-react'

const statusConfig = {
  todo: {
    label: 'To Do',
    icon: Circle,
    className: 'text-gray-400',
  },
  in_progress: {
    label: 'In Progress',
    icon: CircleDot,
    className: 'text-blue-500',
  },
  done: {
    label: 'Completed',
    icon: CheckCircle2,
    className: 'text-emerald-500',
  },
}

const priorityConfig = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-amber-50 text-amber-600',
  high: 'bg-red-50 text-red-600',
}

export default function TaskItem({ task }) {
  const status = statusConfig[task.status] || statusConfig.todo
  const StatusIcon = status.icon

  const priority = priorityConfig[task.priority] || priorityConfig.low

  const dueDate = task.due_date
    ? new Date(task.due_date).toLocaleDateString('en', {
        month: 'short',
        day: 'numeric',
      })
    : 'No due date'

  return (
    <div className="flex items-center gap-4 border-b border-[#f0f0f4] px-5 py-4 last:border-b-0">
      <StatusIcon
        size={19}
        className={`shrink-0 ${status.className}`}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">
          {task.title}
        </p>

        <p className="mt-1 truncate text-xs text-gray-400">
          {task.description || 'No description provided'}
        </p>
      </div>

      <span
        className={`hidden rounded-md px-2.5 py-1 text-xs font-medium capitalize sm:inline-flex ${priority}`}
      >
        {task.priority || 'low'}
      </span>

      <div className="hidden items-center gap-1.5 text-xs text-gray-400 md:flex">
        <CalendarDays size={14} />
        {dueDate}
      </div>

      <span className="hidden text-xs text-gray-400 lg:block">
        {status.label}
      </span>

      <button
        className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        aria-label={`More options for ${task.title}`}
      >
        <MoreHorizontal size={18} />
      </button>
    </div>
  )
}
