
import { useState } from 'react'
import {
  CalendarDays,
  ClipboardList,
  Flag,
  LoaderCircle,
  UserRound,
  X,
} from 'lucide-react'

import './TaskForm.css'

function getInitialFormData(task) {
  return {
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    assigned_to_id: task?.assigned_to_id
      ? String(task.assigned_to_id)
      : '',
    due_date: task?.due_date
      ? (() => {
          const date = new Date(task.due_date)

          if (Number.isNaN(date.getTime())) {
            return ''
          }

          const localDate = new Date(
            date.getTime() - date.getTimezoneOffset() * 60000,
          )

          return localDate.toISOString().slice(0, 16)
        })()
      : '',
  }
}

export default function TaskForm({
  members = [],
  initialTask = null,
  onSubmit,
  onCancel,
  isSaving = false,
  error = '',
}) {
  const [formData, setFormData] = useState(() =>
    getInitialFormData(initialTask),
  )

  function handleChange(event) {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (isSaving) {
      return
    }

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      status: formData.status,
      priority: formData.priority,
      assigned_to_id: formData.assigned_to_id
        ? Number(formData.assigned_to_id)
        : null,
      due_date: formData.due_date
        ? new Date(formData.due_date).toISOString()
        : null,
    }

    onSubmit(payload)
  }

  const isEditing = Boolean(initialTask)

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="task-form__heading">
        <div>
          <p className="task-form__eyebrow">
            TASK MANAGEMENT
          </p>

          <h2>
            {isEditing ? 'Edit task' : 'Create a task'}
          </h2>

          <p>
            {isEditing
              ? 'Update the details of this task.'
              : 'Add a task to your selected workspace.'}
          </p>
        </div>

        <button
          type="button"
          className="task-form__close"
          onClick={onCancel}
          disabled={isSaving}
          aria-label="Close task form"
        >
          <X size={19} />
        </button>
      </div>

      <div className="task-form__body">
        <div className="task-form__field">
          <label htmlFor="task-title">
            Task title <span>*</span>
          </label>

          <div className="task-form__input-wrap">
            <ClipboardList size={17} />

            <input
              id="task-title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              placeholder="What needs to be done?"
              maxLength={200}
              required
              autoFocus
            />
          </div>

          <span className="task-form__hint">
            Maximum 200 characters.
          </span>
        </div>

        <div className="task-form__field">
          <label htmlFor="task-description">
            Description
          </label>

          <textarea
            id="task-description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Add details about this task..."
            rows={4}
            maxLength={5000}
          />
        </div>

        <div className="task-form__row">
          <div className="task-form__field">
            <label htmlFor="task-status">
              Status
            </label>

            <select
              id="task-status"
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Completed</option>
            </select>
          </div>

          <div className="task-form__field">
            <label htmlFor="task-priority">
              <Flag size={14} />
              Priority
            </label>

            <select
              id="task-priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div className="task-form__row">
          <div className="task-form__field">
            <label htmlFor="task-assignee">
              <UserRound size={14} />
              Assign to
            </label>

            <select
              id="task-assignee"
              name="assigned_to_id"
              value={formData.assigned_to_id}
              onChange={handleChange}
            >
              <option value="">Unassigned</option>

              {members.map((member) => (
                <option
                  key={member.user_id}
                  value={member.user_id}
                >
                  {member.full_name} ({member.email})
                </option>
              ))}
            </select>
          </div>

          <div className="task-form__field">
            <label htmlFor="task-due-date">
              <CalendarDays size={14} />
              Due date
            </label>

            <input
              id="task-due-date"
              name="due_date"
              type="datetime-local"
              value={formData.due_date}
              onChange={handleChange}
            />
          </div>
        </div>

        {error && (
          <div className="task-form__error" role="alert">
            {error}
          </div>
        )}
      </div>

      <div className="task-form__footer">
        <button
          type="button"
          className="task-form__cancel"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="task-form__submit"
          disabled={isSaving || !formData.title.trim()}
        >
          {isSaving ? (
            <>
              <LoaderCircle
                size={16}
                className="task-form__spinner"
              />
              Saving...
            </>
          ) : (
            isEditing ? 'Save changes' : 'Create task'
          )}
        </button>
      </div>
    </form>
  )
}
