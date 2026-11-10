
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  CheckSquare,
  CircleCheck,
  Clock3,
  LoaderCircle,
  Plus,
  Users,
} from 'lucide-react'

import DashboardLayout from '../layouts/DashboardLayout'
import StatCard from '../components/StatCard'
import TaskItem from '../components/TaskItem'
import TaskForm from '../components/TaskForm'
import { useWorkspace } from '../context/useWorkspace'
import { getWorkspaceMembers } from '../api/workspaces'
import { createTask, getTasks } from '../api/tasks'

import './Dashboard.css'

const RECENT_TASK_LIMIT = 5
const UPCOMING_TASK_LIMIT = 3
const TASK_PAGE_SIZE = 100

function getRequestError(error, fallback) {
  const detail = error.response?.data?.detail

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(' ')
  }

  if (typeof detail === 'string') {
    return detail
  }

  if (error.response?.status === 403) {
    return 'You do not have permission to access this workspace.'
  }

  if (error.response?.status === 404) {
    return 'The selected workspace could not be found.'
  }

  if (error.response?.status === 429) {
    return 'Too many requests. Please try again later.'
  }

  return fallback
}

function formatDate(dateValue) {
  return new Date(dateValue).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

async function getUpcomingTasks(workspaceId) {
  const upcomingTasks = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let offset = 0
  let total

  while (upcomingTasks.length < UPCOMING_TASK_LIMIT) {
    const response = await getTasks(workspaceId, {
      sort_by: 'due_date',
      sort_order: 'asc',
      limit: TASK_PAGE_SIZE,
      offset,
    })

    const items = Array.isArray(response.items)
      ? response.items
      : []

    total = Number(response.total) || 0

    if (items.length === 0) {
      break
    }

    for (const task of items) {
      if (task.status === 'done' || !task.due_date) {
        continue
      }

      const dueDate = new Date(task.due_date)

      if (Number.isNaN(dueDate.getTime())) {
        continue
      }

      const dueDay = new Date(dueDate)
      dueDay.setHours(0, 0, 0, 0)

      if (dueDay >= today) {
        upcomingTasks.push(task)
      }
    }

    offset += items.length

    if (offset >= total) {
      break
    }
  }

  return upcomingTasks
    .sort(
      (first, second) =>
        new Date(first.due_date) - new Date(second.due_date),
    )
    .slice(0, UPCOMING_TASK_LIMIT)
}

export default function Dashboard() {
  const { selectedWorkspace } = useWorkspace()
  const workspaceId = selectedWorkspace?.id

  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [upcomingTasks, setUpcomingTasks] = useState([])

  const [totalTasks, setTotalTasks] = useState(0)
  const [inProgressTasks, setInProgressTasks] = useState(0)
  const [completedTasks, setCompletedTasks] = useState(0)

  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const loadDashboard = useCallback(async () => {
    if (!workspaceId) {
      setTasks([])
      setMembers([])
      setUpcomingTasks([])
      setTotalTasks(0)
      setInProgressTasks(0)
      setCompletedTasks(0)
      setLoadError('')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError('')

    try {
      const [
        recentResponse,
        inProgressResponse,
        completedResponse,
        membersResponse,
        upcomingResponse,
      ] = await Promise.all([
        getTasks(workspaceId, {
          sort_by: 'created_at',
          sort_order: 'desc',
          limit: RECENT_TASK_LIMIT,
          offset: 0,
        }),
        getTasks(workspaceId, {
          status: 'in_progress',
          limit: 1,
          offset: 0,
        }),
        getTasks(workspaceId, {
          status: 'done',
          limit: 1,
          offset: 0,
        }),
        getWorkspaceMembers(workspaceId),
        getUpcomingTasks(workspaceId),
      ])

      setTasks(
        Array.isArray(recentResponse.items)
          ? recentResponse.items
          : [],
      )

      setTotalTasks(Number(recentResponse.total) || 0)
      setInProgressTasks(Number(inProgressResponse.total) || 0)
      setCompletedTasks(Number(completedResponse.total) || 0)

      setMembers(
        Array.isArray(membersResponse)
          ? membersResponse
          : [],
      )

      setUpcomingTasks(upcomingResponse)
    } catch (error) {
      setLoadError(
        getRequestError(
          error,
          'Unable to load dashboard information. Please try again.',
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    let isActive = true

    const timer = setTimeout(() => {
      if (isActive) {
        loadDashboard()
      }
    }, 0)

    return () => {
      isActive = false
      clearTimeout(timer)
    }
  }, [loadDashboard])

  async function handleCreateTask(payload) {
    if (!workspaceId || isSaving) {
      return
    }

    setIsSaving(true)
    setFormError('')

    try {
      await createTask(workspaceId, payload)

      setIsFormOpen(false)
      setFormError('')

      await loadDashboard()
    } catch (error) {
      setFormError(
        getRequestError(
          error,
          'Unable to create this task. Please try again.',
        ),
      )
    } finally {
      setIsSaving(false)
    }
  }

  function openCreateForm() {
    setFormError('')
    setIsFormOpen(true)
  }

  function closeCreateForm() {
    if (isSaving) {
      return
    }

    setIsFormOpen(false)
    setFormError('')
  }

  const completionPercentage = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0

  const progressStatus = totalTasks === 0
    ? 'No tasks yet'
    : completionPercentage === 100
      ? 'All completed'
      : 'In progress'

  return (
    <DashboardLayout>
      <div className="dashboard-page">
        <section className="dashboard-page__heading">
          <div>
            <p className="dashboard-page__eyebrow">
              WORKSPACE OVERVIEW
            </p>

            <h1 className="dashboard-page__title">
              Dashboard
            </h1>

            <p className="dashboard-page__subtitle">
              {selectedWorkspace
                ? `Here's what's happening in ${selectedWorkspace.name}.`
                : "Here's what's happening with your workspace today."}
            </p>
          </div>

          {selectedWorkspace && (
            <button
              className="dashboard-page__primary-button"
              type="button"
              onClick={openCreateForm}
              disabled={isSaving}
            >
              <Plus size={18} />
              Create new task
            </button>
          )}
        </section>

        {!selectedWorkspace ? (
          <section className="dashboard-state dashboard-state--empty">
            <div className="dashboard-state__icon">
              <CheckSquare size={25} />
            </div>

            <h2>No workspace selected</h2>

            <p>
              Select or create a workspace to view your dashboard.
            </p>

            <Link
              to="/workspaces"
              className="dashboard-state__link"
            >
              Manage workspaces
            </Link>
          </section>
        ) : (
          <>
            <section className="dashboard-page__stats">
              <StatCard
                title="Total Tasks"
                value={totalTasks}
                description="In this workspace"
                icon={CheckSquare}
              />

              <StatCard
                title="In Progress"
                value={inProgressTasks}
                description="Currently being worked on"
                icon={Clock3}
              />

              <StatCard
                title="Completed"
                value={completedTasks}
                description="Successfully completed"
                icon={CircleCheck}
              />

              <StatCard
                title="Team Members"
                value={members.length}
                description="Workspace members"
                icon={Users}
              />
            </section>

            {loadError && (
              <div className="dashboard-message dashboard-message--error">
                <AlertCircle size={17} />
                <span>{loadError}</span>

                <button
                  type="button"
                  onClick={loadDashboard}
                  disabled={isLoading}
                >
                  Retry
                </button>
              </div>
            )}

            <section className="dashboard-page__content-grid">
              <div className="dashboard-panel">
                <div className="dashboard-panel__header">
                  <div>
                    <h2 className="dashboard-panel__heading">
                      Recent Tasks
                    </h2>

                    <p className="dashboard-panel__description">
                      The latest tasks created in this workspace
                    </p>
                  </div>

                  <Link
                    to="/tasks"
                    className="dashboard-panel__link"
                  >
                    View all
                    <ArrowUpRight size={16} />
                  </Link>
                </div>

                {isLoading ? (
                  <div className="dashboard-state">
                    <LoaderCircle
                      size={24}
                      className="dashboard-spin"
                    />
                    <p>Loading recent tasks...</p>
                  </div>
                ) : loadError ? null : tasks.length === 0 ? (
                  <div className="dashboard-state dashboard-state--compact">
                    <div className="dashboard-state__icon">
                      <CheckSquare size={23} />
                    </div>

                    <h2>No tasks yet</h2>

                    <p>
                      Create your first task to start organizing this workspace.
                    </p>

                    <button
                      type="button"
                      className="dashboard-state__link"
                      onClick={openCreateForm}
                    >
                      <Plus size={15} />
                      Create a task
                    </button>
                  </div>
                ) : (
                  <div className="dashboard-panel__tasks">
                    {tasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        members={members}
                      />
                    ))}
                  </div>
                )}

                <div className="dashboard-panel__footer">
                  <Link
                    to="/tasks"
                    className="dashboard-panel__footer-button"
                  >
                    View all tasks
                  </Link>
                </div>
              </div>

              <div className="dashboard-page__side-column">
                <section className="dashboard-widget">
                  <div className="dashboard-widget__header">
                    <div>
                      <h2 className="dashboard-widget__title">
                        Task Progress
                      </h2>

                      <p className="dashboard-widget__subtitle">
                        Overall workspace completion
                      </p>
                    </div>

                    <Activity
                      size={20}
                      className="dashboard-widget__icon"
                    />
                  </div>

                  <div className="dashboard-progress__summary">
                    <h3 className="dashboard-progress__percentage">
                      {completionPercentage}%
                    </h3>

                    <span className="dashboard-progress__status">
                      {progressStatus}
                    </span>
                  </div>

                  <div
                    className="dashboard-progress__track"
                    role="progressbar"
                    aria-label="Task completion"
                    aria-valuenow={completionPercentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="dashboard-progress__bar"
                      style={{
                        width: `${completionPercentage}%`,
                      }}
                    />
                  </div>

                  <div className="dashboard-progress__footer">
                    <span>Completed tasks</span>
                    <span>
                      {completedTasks} of {totalTasks}
                    </span>
                  </div>
                </section>

                <section className="dashboard-widget">
                  <div className="dashboard-summary__heading">
                    <div className="dashboard-summary__icon">
                      <CircleCheck size={21} />
                    </div>

                    <div>
                      <h2 className="dashboard-widget__title">
                        Workspace Summary
                      </h2>

                      <p className="dashboard-widget__subtitle">
                        Current workspace activity
                      </p>
                    </div>
                  </div>

                  <div className="dashboard-summary__list">
                    <div className="dashboard-summary__row">
                      <span className="dashboard-summary__label">
                        Completed tasks
                      </span>

                      <span className="dashboard-summary__value">
                        {completedTasks}
                      </span>
                    </div>

                    <div className="dashboard-summary__row">
                      <span className="dashboard-summary__label">
                        In-progress tasks
                      </span>

                      <span className="dashboard-summary__value">
                        {inProgressTasks}
                      </span>
                    </div>

                    <div className="dashboard-summary__row">
                      <span className="dashboard-summary__label">
                        Workspace members
                      </span>

                      <span className="dashboard-summary__value">
                        {members.length}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="dashboard-widget">
                  <div className="dashboard-upcoming__heading">
                    <CalendarDays
                      size={19}
                      className="dashboard-upcoming__heading-icon"
                    />

                    <h2 className="dashboard-widget__title">
                      Upcoming Deadlines
                    </h2>
                  </div>

                  {isLoading ? (
                    <div className="dashboard-upcoming__empty">
                      Loading deadlines...
                    </div>
                  ) : upcomingTasks.length === 0 ? (
                    <div className="dashboard-upcoming__empty">
                      No upcoming deadlines.
                    </div>
                  ) : (
                    upcomingTasks.map((task, index) => (
                      <div
                        key={task.id}
                        className={`dashboard-upcoming__item ${
                          index === 0
                            ? 'dashboard-upcoming__item--highlight'
                            : ''
                        }`}
                      >
                        <p className="dashboard-upcoming__date">
                          {formatDate(task.due_date)}
                        </p>

                        <p className="dashboard-upcoming__task">
                          {task.title}
                        </p>

                        <p className="dashboard-upcoming__type">
                          {task.priority
                            ? `${task.priority} priority`
                            : 'Task deadline'}
                        </p>
                      </div>
                    ))
                  )}
                </section>
              </div>
            </section>
          </>
        )}

        {isFormOpen && selectedWorkspace && (
          <div
            className="dashboard-modal-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeCreateForm()
              }
            }}
          >
            <section
              className="dashboard-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Create task"
            >
              <TaskForm
                key="dashboard-new-task"
                members={members}
                onSubmit={handleCreateTask}
                onCancel={closeCreateForm}
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
