
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Circle,
  CircleDot,
  Clock3,
  Edit3,
  Flag,
  LoaderCircle,
  RefreshCw,
  UserRound,
} from 'lucide-react'

import DashboardLayout from '../layouts/DashboardLayout'
import TaskForm from '../components/TaskForm'
import { useWorkspace } from '../context/useWorkspace'
import { getWorkspaceMembers } from '../api/workspaces'
import { getTask, updateTask } from '../api/tasks'

import './TaskDetails.css'

const statusConfig = {
  todo: {
    label: 'To Do',
    icon: Circle,
    className: 'task-details__status--todo',
  },
  in_progress: {
    label: 'In Progress',
    icon: CircleDot,
    className: 'task-details__status--progress',
  },
  done: {
    label: 'Completed',
    icon: CheckCircle2,
    className: 'task-details__status--done',
  },
}

const priorityConfig = {
  low: 'task-details__priority--low',
  medium: 'task-details__priority--medium',
  high: 'task-details__priority--high',
}

function getRequestError(error, fallback) {
  const detail = error.response?.data?.detail

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(' ')
  }

  if (typeof detail === 'string') {
    return detail
  }

  if (error.response?.status === 403) {
    return 'You do not have permission to access this task.'
  }

  if (error.response?.status === 404) {
    return 'This task could not be found in the selected workspace.'
  }

  if (error.response?.status === 429) {
    return 'Too many requests. Please try again later.'
  }

  return fallback
}

function formatDate(value, includeTime = false) {
  if (!value) return 'Not set'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Not available'
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(includeTime
      ? { hour: 'numeric', minute: '2-digit' }
      : {}),
  })
}

export default function TaskDetails() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const { selectedWorkspace } = useWorkspace()

  const workspaceId = selectedWorkspace?.id

  const [task, setTask] = useState(null)
  const [members, setMembers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [memberError, setMemberError] = useState('')

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const loadTask = useCallback(async () => {
    if (!workspaceId) {
      setTask(null)
      setIsLoading(false)
      setLoadError('')
      return
    }

    setIsLoading(true)
    setLoadError('')

    try {
      const response = await getTask(workspaceId, taskId)
      setTask(response)
    } catch (error) {
      setTask(null)
      setLoadError(
        getRequestError(error, 'Unable to load this task. Please try again.'),
      )
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId, taskId])

  const loadMembers = useCallback(async () => {
    if (!workspaceId) {
      setMembers([])
      setMemberError('')
      return
    }

    setMemberError('')

    try {
      const response = await getWorkspaceMembers(workspaceId)
      setMembers(Array.isArray(response) ? response : [])
    } catch (error) {
      setMembers([])
      setMemberError(
        getRequestError(error, 'Unable to load workspace members.'),
      )
    }
  }, [workspaceId])

  useEffect(() => {
    let isActive = true

    const timer = setTimeout(() => {
      if (isActive) {
        loadTask()
        loadMembers()
      }
    }, 0)

    return () => {
      isActive = false
      clearTimeout(timer)
    }
  }, [loadTask, loadMembers])

  function openEditForm() {
    setFormError('')
    setIsFormOpen(true)
  }

  function closeForm() {
    if (isSaving) return

    setIsFormOpen(false)
    setFormError('')
  }

  async function handleSubmit(payload) {
    if (!workspaceId || !task || isSaving) return

    setIsSaving(true)
    setFormError('')

    try {
      const updatedTask = await updateTask(
        workspaceId,
        task.id,
        payload,
      )

      setTask(updatedTask)
      setIsFormOpen(false)
    } catch (error) {
      setFormError(
        getRequestError(error, 'Unable to update this task. Please try again.'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  const assignedMember = task?.assigned_to_id
    ? members.find(
        (member) =>
          Number(member.user_id) === Number(task.assigned_to_id),
      )
    : null

  const status = task
    ? statusConfig[task.status] || statusConfig.todo
    : statusConfig.todo

  const StatusIcon = status.icon

  const priorityClass = task
    ? priorityConfig[task.priority] || priorityConfig.low
    : priorityConfig.low

  return (
    <DashboardLayout>
      <div className="task-details-page">
        <div className="task-details-page__navigation">
          <button
            type="button"
            className="task-details-page__back"
            onClick={() => navigate('/tasks')}
          >
            <ArrowLeft size={16} />
            Back to tasks
          </button>

          {task && !isLoading && (
            <button
              type="button"
              className="task-details-page__edit"
              onClick={openEditForm}
            >
              <Edit3 size={16} />
              Edit task
            </button>
          )}
        </div>

        {!selectedWorkspace ? (
          <section className="task-details-state">
            <AlertCircle size={27} />
            <h2>No workspace selected</h2>
            <p>Select a workspace before viewing task details.</p>
            <Link to="/workspaces">Manage workspaces</Link>
          </section>
        ) : isLoading ? (
          <section className="task-details-state">
            <LoaderCircle
              size={27}
              className="task-details-spin"
            />
            <p>Loading task details...</p>
          </section>
        ) : loadError ? (
          <section className="task-details-state task-details-state--error">
            <AlertCircle size={27} />
            <h2>Unable to load task</h2>
            <p>{loadError}</p>
            <button type="button" onClick={loadTask}>
              <RefreshCw size={15} />
              Try again
            </button>
          </section>
        ) : task ? (
          <>
            <section className="task-details-card">
              <div className="task-details-card__eyebrow">
                <span>TASK DETAILS</span>
                <span>#{task.id}</span>
              </div>

              <div className="task-details-card__heading">
                <div className="task-details-card__title-wrap">
                  <div className={`task-details__status ${status.className}`}>
                    <StatusIcon size={17} />
                    {status.label}
                  </div>

                  <h1>{task.title}</h1>
                </div>

                <span className={`task-details__priority ${priorityClass}`}>
                  <Flag size={13} />
                  {task.priority}
                  {' '}priority
                </span>
              </div>

              <div className="task-details-card__divider" />

              <div className="task-details-section">
                <h2>Description</h2>
                <p className="task-details-card__description">
                  {task.description || 'No description has been provided for this task.'}
                </p>
              </div>
            </section>

            <section className="task-details-information">
              <div className="task-details-information__heading">
                <h2>Task information</h2>
                <p>Assignment and scheduling details</p>
              </div>

              <div className="task-details-information__grid">
                <div className="task-details-information__item">
                  <div className="task-details-information__icon">
                    <UserRound size={18} />
                  </div>
                  <div>
                    <span>Assigned to</span>
                    <strong>
                      {task.assigned_to_id
                        ? assignedMember?.full_name || 'Member information unavailable'
                        : 'Unassigned'}
                    </strong>
                  </div>
                </div>

                <div className="task-details-information__item">
                  <div className="task-details-information__icon">
                    <CalendarDays size={18} />
                  </div>
                  <div>
                    <span>Due date</span>
                    <strong>{formatDate(task.due_date, true)}</strong>
                  </div>
                </div>

                <div className="task-details-information__item">
                  <div className="task-details-information__icon">
                    <Clock3 size={18} />
                  </div>
                  <div>
                    <span>Created</span>
                    <strong>{formatDate(task.created_at, true)}</strong>
                  </div>
                </div>

                <div className="task-details-information__item">
                  <div className="task-details-information__icon">
                    <RefreshCw size={18} />
                  </div>
                  <div>
                    <span>Last updated</span>
                    <strong>{formatDate(task.updated_at, true)}</strong>
                  </div>
                </div>
              </div>

              {memberError && (
                <div className="task-details-member-error">
                  <AlertCircle size={15} />
                  {memberError}
                  <button type="button" onClick={loadMembers}>
                    Retry
                  </button>
                </div>
              )}
            </section>

            <div className="task-details-page__footer">
              <span>Workspace</span>
              <strong>{selectedWorkspace.name}</strong>
            </div>
          </>
        ) : null}

        {isFormOpen && task && (
          <div
            className="task-details-modal-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeForm()
              }
            }}
          >
            <section
              className="task-details-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Edit task"
            >
              <TaskForm
                key={task.id}
                members={members}
                initialTask={task}
                onSubmit={handleSubmit}
                onCancel={closeForm}
                isSaving={isSaving}
                error={formError}
              />
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
