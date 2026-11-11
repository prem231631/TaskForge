
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  Circle,
  CircleDot,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserRound,
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

export default function TaskItem({
  task,
  members = [],
  onEdit,
  onDelete,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const status = statusConfig[task.status] || statusConfig.todo
  const StatusIcon = status.icon

  const priority =
    priorityConfig[task.priority] || priorityConfig.low

  const hasActions = Boolean(onEdit || onDelete)

  const assignedMember = task.assigned_to_id
    ? members.find(
        (member) => Number(member.user_id) === Number(task.assigned_to_id),
      )
    : null

  const assigneeName = assignedMember?.full_name || null

  const dueDate = task.due_date
    ? new Date(task.due_date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'No due date'

  function handleEdit() {
    setIsMenuOpen(false)
    onEdit?.(task)
  }

  function handleDelete() {
    setIsMenuOpen(false)
    onDelete?.(task)
  }

  return (
    <div className="task-item">
      <StatusIcon
        size={19}
        className={`task-item__status-icon ${status.className}`}
      />

      <div className="task-item__details">
        <Link
          to={`/tasks/${task.id}`}
          className="task-item__title-link"
          title={`View details for ${task.title}`}
        >
          <p className="task-item__title">
            {task.title}
          </p>
        </Link>

        <p className="task-item__description">
          {task.description || 'No description provided'}
        </p>
      </div>

      <span className={`task-item__priority ${priority}`}>
        {task.priority || 'low'}
      </span>

      <div className="task-item__assignee" title={assigneeName || 'Unassigned'}>
        <UserRound size={14} />
        <span>{assigneeName || 'Unassigned'}</span>
      </div>

      <div className="task-item__due-date">
        <CalendarDays size={14} />
        {dueDate}
      </div>

      <span className="task-item__status-label">
        {status.label}
      </span>

      {hasActions && (
        <div className="task-item__actions">
          <button
            className="task-item__more"
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
            aria-label={`More options for ${task.title}`}
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
          >
            <MoreHorizontal size={18} />
          </button>

          {isMenuOpen && (
            <div className="task-item__menu" role="menu">
              {onEdit && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleEdit}
                >
                  <Pencil size={14} />
                  Edit task
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  role="menuitem"
                  className="task-item__menu-delete"
                  onClick={handleDelete}
                >
                  <Trash2 size={14} />
                  Delete task
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
