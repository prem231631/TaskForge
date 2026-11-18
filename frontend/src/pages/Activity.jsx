
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity as ActivityIcon,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CirclePlus,
  Clock3,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Trash2,
  UserMinus,
  UserPlus,
} from 'lucide-react'

import DashboardLayout from '../layouts/DashboardLayout'
import { useWorkspace } from '../context/useWorkspace'
import { getWorkspaceActivities } from '../api/activities'

import './Activity.css'

const PAGE_SIZE = 20

const activityConfig = {
  task_created: {
    label: 'Task created',
    icon: CirclePlus,
  },
  task_updated: {
    label: 'Task updated',
    icon: Pencil,
  },
  task_status_changed: {
    label: 'Task status changed',
    icon: ActivityIcon,
  },
  task_completed: {
    label: 'Task completed',
    icon: CheckCircle2,
  },
  task_assigned: {
    label: 'Task assigned',
    icon: UserPlus,
  },
  task_reassigned: {
    label: 'Task reassigned',
    icon: UserPlus,
  },
  task_unassigned: {
    label: 'Task unassigned',
    icon: UserMinus,
  },
  task_deleted: {
    label: 'Task deleted',
    icon: Trash2,
  },
  workspace_member_added: {
    label: 'Member added',
    icon: UserPlus,
  },
  workspace_member_removed: {
    label: 'Member removed',
    icon: UserMinus,
  },
}

function formatActivityType(value = '') {
  return value
    .split('_')
    .filter(Boolean)
    .map(
      (word) => word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ') || 'Workspace activity'
}

function formatActivityDate(value) {
  if (!value) return 'Date unavailable'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable'
  }

  const now = new Date()
  const difference = Math.max(0, now.getTime() - date.getTime())
  const minutes = Math.floor(difference / 60000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)

  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)

  if (days < 7) return `${days}d ago`

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year:
      date.getFullYear() !== now.getFullYear()
        ? 'numeric'
        : undefined,
  })
}

function formatFullDate(value) {
  if (!value) return 'Date unavailable'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable'
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getRequestError(error) {
  const detail = error.response?.data?.detail

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(' ')
  }

  if (typeof detail === 'string') {
    return detail
  }

  if (error.response?.status === 404) {
    return 'This workspace could not be found or you no longer have access to it.'
  }

  if (error.response?.status === 429) {
    return 'Too many requests. Please try again shortly.'
  }

  return 'Unable to load workspace activity. Please check your connection and try again.'
}

export default function Activity() {
  const {
    selectedWorkspace,
    isLoading: isWorkspaceLoading,
  } = useWorkspace()

  return (
    <DashboardLayout>
      <ActivityContent
        key={selectedWorkspace?.id ?? 'no-workspace'}
        selectedWorkspace={selectedWorkspace}
        isWorkspaceLoading={isWorkspaceLoading}
      />
    </DashboardLayout>
  )
}

function ActivityContent({
  selectedWorkspace,
  isWorkspaceLoading,
}) {
  const workspaceId = selectedWorkspace?.id

  const [activities, setActivities] = useState([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)

  useEffect(() => {
    let isActive = true

    async function loadActivities() {
      if (!workspaceId) {
        setActivities([])
        setTotal(0)
        setHasMore(false)
        setError('')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError('')

      try {
        const response = await getWorkspaceActivities(
          workspaceId,
          {
            skip: page * PAGE_SIZE,
            limit: PAGE_SIZE,
          },
        )

        if (!isActive) return

        setActivities(
          Array.isArray(response.items) ? response.items : [],
        )
        setTotal(response.total ?? 0)
        setHasMore(Boolean(response.has_more))
      } catch (requestError) {
        if (!isActive) return

        setActivities([])
        setTotal(0)
        setHasMore(false)
        setError(getRequestError(requestError))
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadActivities()

    return () => {
      isActive = false
    }
  }, [workspaceId, page, refreshVersion])

  function handleRefresh() {
    setRefreshVersion((current) => current + 1)
  }

  const firstItem =
    total === 0 ? 0 : page * PAGE_SIZE + 1

  const lastItem = Math.min(
    (page + 1) * PAGE_SIZE,
    total,
  )

  const pageCount = Math.max(
    1,
    Math.ceil(total / PAGE_SIZE),
  )

  return (
    <div className="activity-page">
      <section className="activity-page__heading">
        <div>
          <p className="activity-page__eyebrow">
            WORKSPACE HISTORY
          </p>

          <h1 className="activity-page__title">
            Activity Log
          </h1>

          <p className="activity-page__subtitle">
            Follow the changes and updates happening across your workspace.
          </p>
        </div>

        <button
          type="button"
          className="activity-page__refresh"
          onClick={handleRefresh}
          disabled={isLoading || !workspaceId}
        >
          <RefreshCw
            size={16}
            className={
              isLoading ? 'activity-page__spin' : ''
            }
          />
          Refresh
        </button>
      </section>

      {isWorkspaceLoading ? (
        <section className="activity-state">
          <LoaderCircle
            size={27}
            className="activity-page__spin"
          />
          <p>Loading your workspace...</p>
        </section>
      ) : !selectedWorkspace ? (
        <section className="activity-state">
          <div className="activity-state__icon">
            <ActivityIcon size={26} />
          </div>

          <h2>No workspace selected</h2>

          <p>
            Select or create a workspace to view its activity history.
          </p>

          <Link
            to="/workspaces"
            className="activity-state__link"
          >
            Manage workspaces
            <ArrowRight size={15} />
          </Link>
        </section>
      ) : (
        <>
          <section className="activity-overview">
            <div className="activity-overview__icon">
              <ActivityIcon size={22} />
            </div>

            <div className="activity-overview__content">
              <span>SELECTED WORKSPACE</span>
              <strong>{selectedWorkspace.name}</strong>
            </div>

            <div className="activity-overview__total">
              <span>Total events</span>
              <strong>{total}</strong>
            </div>
          </section>

          {error && (
            <div className="activity-message">
              <AlertCircle size={17} />
              <span>{error}</span>
            </div>
          )}

          <section className="activity-list">
            <div className="activity-list__heading">
              <div>
                <h2>Workspace timeline</h2>
                <p>
                  A chronological record of tasks and member changes.
                </p>
              </div>

              <span className="activity-list__count">
                {total} {total === 1 ? 'event' : 'events'}
              </span>
            </div>

            {isLoading ? (
              <div className="activity-state">
                <LoaderCircle
                  size={27}
                  className="activity-page__spin"
                />
                <p>Loading workspace activity...</p>
              </div>
            ) : error ? (
              <div className="activity-state activity-state--error">
                <div className="activity-state__icon">
                  <AlertCircle size={25} />
                </div>

                <h2>Unable to load activity</h2>

                <p>
                  Your activity history could not be retrieved.
                </p>

                <button
                  type="button"
                  className="activity-state__retry"
                  onClick={handleRefresh}
                >
                  <RefreshCw size={15} />
                  Try again
                </button>
              </div>
            ) : activities.length === 0 ? (
              <div className="activity-state">
                <div className="activity-state__icon">
                  <ActivityIcon size={26} />
                </div>

                <h2>No activity yet</h2>

                <p>
                  Task updates and workspace member changes will appear here.
                </p>
              </div>
            ) : (
              <div className="activity-timeline">
                {activities.map((activity) => {
                  const config =
                    activityConfig[activity.action_type] || {
                      label: formatActivityType(
                        activity.action_type,
                      ),
                      icon: ActivityIcon,
                    }

                  const EventIcon = config.icon

                  return (
                    <article
                      className="activity-entry"
                      key={activity.id}
                    >
                      <div className="activity-entry__timeline">
                        <div className="activity-entry__icon">
                          <EventIcon size={17} />
                        </div>
                      </div>

                      <div className="activity-entry__content">
                        <div className="activity-entry__meta">
                          <span className="activity-entry__type">
                            {config.label}
                          </span>

                          <span
                            className="activity-entry__date"
                            title={formatFullDate(
                              activity.created_at,
                            )}
                          >
                            <Clock3 size={13} />
                            {formatActivityDate(
                              activity.created_at,
                            )}
                          </span>
                        </div>

                        <p className="activity-entry__description">
                          {activity.description}
                        </p>

                        {activity.task_id != null && (
                          <Link
                            to={`/tasks/${activity.task_id}`}
                            className="activity-entry__task-link"
                          >
                            View task
                            <ArrowRight size={14} />
                          </Link>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          {!isLoading && !error && total > 0 && (
            <section className="activity-pagination">
              <p>
                Showing <strong>{firstItem}-{lastItem}</strong> of{' '}
                <strong>{total}</strong> events
              </p>

              <div className="activity-pagination__actions">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() =>
                    setPage((current) => current - 1)
                  }
                >
                  Previous
                </button>

                <span>
                  Page {page + 1} of {pageCount}
                </span>

                <button
                  type="button"
                  disabled={!hasMore}
                  onClick={() =>
                    setPage((current) => current + 1)
                  }
                >
                  Next
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
