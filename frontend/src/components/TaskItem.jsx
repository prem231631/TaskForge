import {
  CalendarDays,
  Circle,
  CircleDot,
  CheckCircle2,
  MoreHorizontal,
} from 'lucide-react'

import './TaskItem.css'

const statusConfig = {
  todo: {
    label: 'To Do',
    icon: Circle,
    className: 'task-item__status-icon--todo',
  },
  in_progress: {
    label: 'In Progress',
    icon: CircleDot,
    className: 'task-item__status-icon--in-progress',
  },
  done: {
    label: 'Completed',
    icon: CheckCircle2,
    className: 'task-item__status-icon--done',
  },
}

const priorityConfig = {
  low: 'task-item__priority--low',
  medium: 'task-item__priority--medium',
  high: 'task-item__priority--high',
}

export default function TaskItem({ task }) {
  const status = statusConfig[task.status] || statusConfig.todo
  const StatusIcon = status.icon

  const priority =
    priorityConfig[task.priority] || priorityConfig.low

  const dueDate = task.due_date
    ? new Date(task.due_date).toLocaleDateString('en', {
        month: 'short',
        day: 'numeric',
      })
    : 'No due date'

  return (
    <div className="task-item">
      <StatusIcon
        size={19}
        className={`task-item__status-icon ${status.className}`}
      />

      <div className="task-item__details">
        <p className="task-item__title">
          {task.title}
        </p>

        <p className="task-item__description">
          {task.description || 'No description provided'}
        </p>
      </div>

      <span className={`task-item__priority ${priority}`}>
        {task.priority || 'low'}
      </span>

      <div className="task-item__due-date">
        <CalendarDays size={14} />
        {dueDate}
      </div>

      <span className="task-item__status-label">
        {status.label}
      </span>

      <button
        className="task-item__more"
        type="button"
        aria-label={`More options for ${task.title}`}
      >
        <MoreHorizontal size={18} />
      </button>
    </div>
  )
}