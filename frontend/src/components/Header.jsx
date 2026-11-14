
import { useEffect, useRef, useState } from 'react'
import {
  Search,
  Bell,
  ChevronDown,
  Menu,
  Plus,
  Sun,
  Moon,
  LogOut,
  UserRound,
  Check,
  CheckCheck,
  Clock,
  BellRing,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useTheme } from '../context/useTheme'
import { useAuth } from '../context/useAuth'
import { useNotifications } from '../context/useNotifications'
import './Header.css'

function formatNotificationDate(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const now = new Date()
  const difference = now.getTime() - date.getTime()

  if (difference < 60_000) {
    return 'Just now'
  }

  if (difference < 3_600_000) {
    return `${Math.floor(difference / 60_000)}m ago`
  }

  if (difference < 86_400_000) {
    return `${Math.floor(difference / 3_600_000)}h ago`
  }

  if (difference < 604_800_000) {
    return `${Math.floor(difference / 86_400_000)}d ago`
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year:
      date.getFullYear() !== now.getFullYear()
        ? 'numeric'
        : undefined,
  })
}

export default function Header() {
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const {
    notifications,
    unreadCount,
    isLoading: areNotificationsLoading,
    error: notificationError,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications()

  const navigate = useNavigate()

  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [notificationActionError, setNotificationActionError] =
    useState(null)
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  const notificationWrapperRef = useRef(null)
  const profileWrapperRef = useRef(null)

  const fullName = user?.full_name || user?.name || 'TaskForge User'

  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        notificationWrapperRef.current &&
        !notificationWrapperRef.current.contains(event.target)
      ) {
        setIsNotificationsOpen(false)
      }

      if (
        profileWrapperRef.current &&
        !profileWrapperRef.current.contains(event.target)
      ) {
        setIsProfileOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsNotificationsOpen(false)
        setIsProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  function handleLogout() {
    logout()
    setIsProfileOpen(false)
    setIsNotificationsOpen(false)
    navigate('/login', { replace: true })
  }

  function handleAccount() {
    setIsProfileOpen(false)
    navigate('/profile')
  }

  async function handleNotificationToggle() {
    const nextOpen = !isNotificationsOpen

    setIsNotificationsOpen(nextOpen)
    setIsProfileOpen(false)
    setNotificationActionError(null)

    if (nextOpen) {
      try {
        await refreshNotifications({ limit: 10 })
      } catch {
        // The context exposes the request error to the dropdown.
      }
    }
  }

  async function handleMarkAsRead(notificationId) {
    setNotificationActionError(null)

    try {
      await markAsRead(notificationId)
    } catch (error) {
      setNotificationActionError(
        error.response?.data?.detail ||
          'Unable to mark this notification as read.',
      )
    }
  }

  async function handleMarkAllAsRead() {
    setIsMarkingAll(true)
    setNotificationActionError(null)

    try {
      await markAllAsRead()
    } catch (error) {
      setNotificationActionError(
        error.response?.data?.detail ||
          'Unable to mark all notifications as read.',
      )
    } finally {
      setIsMarkingAll(false)
    }
  }

  function handleViewAllNotifications() {
    setIsNotificationsOpen(false)
    navigate('/notifications')
  }

  return (
    <header className="dashboard-header">
      <div className="dashboard-header__left">
        <button
          className="dashboard-header__mobile-menu"
          aria-label="Open navigation"
          type="button"
        >
          <Menu size={21} />
        </button>

        <div className="dashboard-header__search">
          <Search
            size={18}
            className="dashboard-header__search-icon"
          />

          <input
            type="search"
            placeholder="Search anything..."
            aria-label="Search"
          />

          <span className="dashboard-header__shortcut">
            /
          </span>
        </div>
      </div>

      <div className="dashboard-header__right">
        <button
          className="dashboard-header__new-task"
          type="button"
        >
          <Plus size={17} />
          New Task
        </button>

        <button
          className="dashboard-header__icon-button"
          type="button"
          aria-label={
            theme === 'light'
              ? 'Switch to dark theme'
              : 'Switch to light theme'
          }
          onClick={toggleTheme}
        >
          {theme === 'light' ? (
            <Moon size={19} />
          ) : (
            <Sun size={19} />
          )}
        </button>

        <div
          className="dashboard-header__notification-wrapper"
          ref={notificationWrapperRef}
        >
          <button
            className="dashboard-header__icon-button dashboard-header__notification-button"
            type="button"
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : 'Notifications'
            }
            aria-expanded={isNotificationsOpen}
            aria-haspopup="dialog"
            onClick={handleNotificationToggle}
          >
            <Bell size={20} />

            {unreadCount > 0 && (
              <span className="dashboard-header__notification-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <section
              className="dashboard-header__notification-panel"
              role="dialog"
              aria-label="Recent notifications"
            >
              <div className="dashboard-header__notification-heading">
                <div>
                  <h2>Notifications</h2>
                  <p>
                    {unreadCount > 0
                      ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                      : 'You are all caught up'}
                  </p>
                </div>

                {unreadCount > 0 && (
                  <button
                    className="dashboard-header__mark-all"
                    type="button"
                    onClick={handleMarkAllAsRead}
                    disabled={isMarkingAll}
                  >
                    <CheckCheck size={15} />
                    {isMarkingAll ? 'Updating...' : 'Mark all read'}
                  </button>
                )}
              </div>

              {notificationActionError && (
                <div
                  className="dashboard-header__notification-error"
                  role="alert"
                >
                  {notificationActionError}
                </div>
              )}

              {notificationError && (
                <div
                  className="dashboard-header__notification-error"
                  role="alert"
                >
                  {notificationError}
                </div>
              )}

              {areNotificationsLoading ? (
                <div className="dashboard-header__notification-state">
                  <span className="dashboard-header__notification-spinner" />
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="dashboard-header__notification-empty">
                  <div className="dashboard-header__notification-empty-icon">
                    <BellRing size={23} />
                  </div>
                  <h3>No notifications yet</h3>
                  <p>
                    Updates about workspace activity and tasks will
                    appear here.
                  </p>
                </div>
              ) : (
                <div className="dashboard-header__notification-list">
                  {notifications.slice(0, 10).map((notification) => (
                    <article
                      className={`dashboard-header__notification-item ${
                        notification.is_read
                          ? ''
                          : 'dashboard-header__notification-item--unread'
                      }`}
                      key={notification.id}
                    >
                      <div className="dashboard-header__notification-item-icon">
                        <Bell size={16} />
                      </div>

                      <div className="dashboard-header__notification-content">
                        <div className="dashboard-header__notification-title">
                          {notification.title}
                        </div>

                        <p>{notification.message}</p>

                        <span className="dashboard-header__notification-time">
                          <Clock size={12} />
                          {formatNotificationDate(notification.created_at)}
                        </span>
                      </div>

                      {!notification.is_read && (
                        <button
                          className="dashboard-header__notification-read"
                          type="button"
                          aria-label={`Mark ${notification.title} as read`}
                          title="Mark as read"
                          onClick={() =>
                            handleMarkAsRead(notification.id)
                          }
                        >
                          <Check size={16} />
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              )}

              <button
                className="dashboard-header__notification-footer"
                type="button"
                onClick={handleViewAllNotifications}
              >
                View all notifications
              </button>
            </section>
          )}
        </div>

        <div className="dashboard-header__divider" />

        <div
          className="dashboard-header__profile-wrapper"
          ref={profileWrapperRef}
        >
          <button
            className="dashboard-header__profile"
            type="button"
            aria-label="User profile menu"
            aria-expanded={isProfileOpen}
            onClick={() => {
              setIsProfileOpen((previous) => !previous)
              setIsNotificationsOpen(false)
            }}
          >
            <div className="dashboard-header__avatar">
              {initials || 'TF'}
            </div>

            <div className="dashboard-header__profile-info">
              <p className="dashboard-header__profile-name">
                {fullName}
              </p>

              <p className="dashboard-header__profile-role">
                Workspace member
              </p>
            </div>

            <ChevronDown
              size={15}
              className="dashboard-header__profile-chevron"
            />
          </button>

          {isProfileOpen && (
            <div className="dashboard-header__dropdown">
              <div className="dashboard-header__dropdown-user">
                <div className="dashboard-header__dropdown-name">
                  {fullName}
                </div>

                <div className="dashboard-header__dropdown-email">
                  {user?.email || ''}
                </div>
              </div>

              <div className="dashboard-header__dropdown-divider" />

              <button
                className="dashboard-header__dropdown-item"
                type="button"
                onClick={handleAccount}
              >
                <UserRound size={17} />
                Account
              </button>

              <button
                className="dashboard-header__dropdown-item dashboard-header__dropdown-logout"
                type="button"
                onClick={handleLogout}
              >
                <LogOut size={17} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
