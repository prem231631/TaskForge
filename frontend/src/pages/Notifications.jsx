
import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Bell,
  Check,
  CheckCheck,
  Clock,
  Inbox,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react'

import DashboardLayout from '../layouts/DashboardLayout'
import { useNotifications } from '../context/useNotifications'

import './Notifications.css'

const PAGE_SIZE = 20

function formatNotificationDate(value) {
  if (!value) return 'Recently'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Recently'

  const difference = Date.now() - date.getTime()
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
    year: date.getFullYear() !== new Date().getFullYear()
      ? 'numeric'
      : undefined,
  })
}

function formatNotificationType(value = '') {
  return value
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Notification'
}

export default function Notifications() {
  const {
    notifications,
    total,
    unreadCount,
    isLoading,
    error,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications()

  const [page, setPage] = useState(0)
  const [actionError, setActionError] = useState('')
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const [markingId, setMarkingId] = useState(null)

  useEffect(() => {
    let isActive = true

    const timer = setTimeout(() => {
      if (isActive) {
        refreshNotifications({
          skip: page * PAGE_SIZE,
          limit: PAGE_SIZE,
        }).catch(() => {})
      }
    }, 0)

    return () => {
      isActive = false
      clearTimeout(timer)
    }
  }, [page, refreshNotifications])

  async function handleMarkAsRead(notificationId) {
    if (markingId !== null) return

    setMarkingId(notificationId)
    setActionError('')

    try {
      await markAsRead(notificationId)
    } catch {
      setActionError('Unable to mark this notification as read. Please try again.')
    } finally {
      setMarkingId(null)
    }
  }

  async function handleMarkAllAsRead() {
    if (isMarkingAll || unreadCount === 0) return

    setIsMarkingAll(true)
    setActionError('')

    try {
      await markAllAsRead()
    } catch {
      setActionError('Unable to mark all notifications as read. Please try again.')
    } finally {
      setIsMarkingAll(false)
    }
  }

  async function handleRefresh() {
    setActionError('')

    try {
      await refreshNotifications({
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      })
    } catch {
      // The notification context exposes the request error.
    }
  }

  const pageCount = Math.ceil(total / PAGE_SIZE)
  const firstItem = total === 0 ? 0 : page * PAGE_SIZE + 1
  const lastItem = Math.min((page + 1) * PAGE_SIZE, total)

  return (
    <DashboardLayout>
      <div className="notifications-page">
        <section className="notifications-page__heading">
          <div>
            <p className="notifications-page__eyebrow">
              YOUR ACTIVITY
            </p>

            <h1 className="notifications-page__title">
              Notifications
            </h1>

            <p className="notifications-page__subtitle">
              Stay up to date with workspace activity and task updates.
            </p>
          </div>

          <button
            type="button"
            className="notifications-page__refresh"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              size={16}
              className={isLoading ? 'notifications-page__spin' : ''}
            />
            Refresh
          </button>
        </section>

        <section className="notifications-summary">
          <div className="notifications-summary__icon">
            <Bell size={22} />
          </div>

          <div className="notifications-summary__content">
            <span>UNREAD NOTIFICATIONS</span>
            <strong>{unreadCount}</strong>
          </div>

          <div className="notifications-summary__total">
            <span>Total notifications</span>
            <strong>{total}</strong>
          </div>

          <button
            type="button"
            className="notifications-summary__mark-all"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || isMarkingAll}
          >
            {isMarkingAll ? (
              <LoaderCircle
                size={15}
                className="notifications-page__spin"
              />
            ) : (
              <CheckCheck size={16} />
            )}
            {isMarkingAll ? 'Updating...' : 'Mark all as read'}
          </button>
        </section>

        {(actionError || error) && (
          <div className="notifications-message notifications-message--error">
            <AlertCircle size={17} />
            <span>{actionError || error}</span>
          </div>
        )}

        <section className="notifications-list">
          <div className="notifications-list__heading">
            <div>
              <h2>All activity</h2>
              <p>Your latest notifications and updates.</p>
            </div>

            <span className="notifications-list__count">
              {total} {total === 1 ? 'notification' : 'notifications'}
            </span>
          </div>

          {isLoading ? (
            <div className="notifications-state">
              <LoaderCircle
                size={27}
                className="notifications-page__spin"
              />
              <p>Loading notifications...</p>
            </div>
          ) : error ? (
            <div className="notifications-state notifications-state--error">
              <div className="notifications-state__icon">
                <AlertCircle size={25} />
              </div>

              <h3>Unable to load notifications</h3>
              <p>Please check your connection and try again.</p>

              <button
                type="button"
                className="notifications-state__retry"
                onClick={handleRefresh}
              >
                <RefreshCw size={15} />
                Try again
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notifications-state">
              <div className="notifications-state__icon">
                <Inbox size={26} />
              </div>

              <h3>You're all caught up</h3>
              <p>
                New workspace and task updates will appear here.
              </p>
            </div>
          ) : (
            <div className="notifications-list__items">
              {notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`notification-row ${
                    notification.is_read
                      ? 'notification-row--read'
                      : 'notification-row--unread'
                  }`}
                >
                  <div className="notification-row__icon">
                    <Bell size={19} />
                  </div>

                  <div className="notification-row__content">
                    <div className="notification-row__meta">
                      <span className="notification-row__type">
                        {formatNotificationType(notification.notification_type)}
                      </span>

                      {!notification.is_read && (
                        <span className="notification-row__unread-label">
                          Unread
                        </span>
                      )}
                    </div>

                    <h3>{notification.title}</h3>

                    <p>{notification.message}</p>

                    <span className="notification-row__date">
                      <Clock size={13} />
                      {formatNotificationDate(notification.created_at)}
                    </span>
                  </div>

                  {!notification.is_read && (
                    <button
                      type="button"
                      className="notification-row__mark-read"
                      onClick={() => handleMarkAsRead(notification.id)}
                      disabled={markingId !== null}
                      aria-label={`Mark "${notification.title}" as read`}
                      title="Mark as read"
                    >
                      {markingId === notification.id ? (
                        <LoaderCircle
                          size={16}
                          className="notifications-page__spin"
                        />
                      ) : (
                        <>
                          <Check size={16} />
                          <span>Mark read</span>
                        </>
                      )}
                    </button>
                  )}

                  {notification.is_read && (
                    <span
                      className="notification-row__read-indicator"
                      title="Read"
                    >
                      <CheckCheck size={17} />
                    </span>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {!isLoading && !error && total > 0 && (
          <section className="notifications-pagination">
            <p>
              Showing <strong>{firstItem}-{lastItem}</strong> of{' '}
              <strong>{total}</strong> notifications
            </p>

            <div className="notifications-pagination__actions">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>

              <span>
                Page {page + 1} of {pageCount}
              </span>

              <button
                type="button"
                disabled={page + 1 >= pageCount}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  )
}
