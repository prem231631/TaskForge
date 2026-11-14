
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead as markAllNotificationsRequest,
  markNotificationAsRead as markNotificationAsReadRequest,
} from '../api/notifications'

import { useAuth } from './useAuth'
import { NotificationContext } from './notification-context'

export function NotificationProvider({ children }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()

  const [notifications, setNotifications] = useState([])
  const [total, setTotal] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const refreshNotifications = useCallback(
    async (params = {}) => {
      if (!isAuthenticated) {
        setNotifications([])
        setTotal(0)
        setUnreadCount(0)
        setError(null)
        setIsLoading(false)

        return {
          items: [],
          total: 0,
          unread_count: 0,
          skip: 0,
          limit: 20,
        }
      }

      setIsLoading(true)
      setError(null)

      try {
        const data = await getNotifications(params)

        setNotifications(
          Array.isArray(data.items) ? data.items : [],
        )
        setTotal(data.total ?? 0)
        setUnreadCount(data.unread_count ?? 0)

        return data
      } catch (requestError) {
        setError(
          requestError.response?.data?.detail ||
            'Unable to load notifications.',
        )
        throw requestError
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated],
  )

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0)
      return 0
    }

    try {
      const data = await getUnreadNotificationCount()
      const count = data.unread_count ?? 0

      setUnreadCount(count)

      return count
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          'Unable to refresh notification count.',
      )
      throw requestError
    }
  }, [isAuthenticated])

  const markAsRead = useCallback(
    async (notificationId) => {
      const updatedNotification =
        await markNotificationAsReadRequest(notificationId)

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === updatedNotification.id
            ? updatedNotification
            : notification,
        ),
      )

      if (updatedNotification.is_read) {
        setUnreadCount((current) => Math.max(0, current - 1))
      }

      return updatedNotification
    },
    [],
  )

  const markAllAsRead = useCallback(async () => {
    const result = await markAllNotificationsRequest()

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        is_read: true,
        read_at: notification.read_at || new Date().toISOString(),
      })),
    )

    setUnreadCount(0)

    return result
  }, [])

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) {
      return undefined
    }

    let isMounted = true

    async function loadNotifications() {
      setIsLoading(true)
      setError(null)

      try {
        const data = await getNotifications()

        if (!isMounted) {
          return
        }

        setNotifications(
          Array.isArray(data.items) ? data.items : [],
        )
        setTotal(data.total ?? 0)
        setUnreadCount(data.unread_count ?? 0)
      } catch (requestError) {
        if (isMounted) {
          setError(
            requestError.response?.data?.detail ||
              'Unable to load notifications.',
          )
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadNotifications()

    return () => {
      isMounted = false
    }
  }, [isAuthenticated, isAuthLoading])

  const value = useMemo(
    () => ({
      notifications: isAuthenticated ? notifications : [],
      total: isAuthenticated ? total : 0,
      unreadCount: isAuthenticated ? unreadCount : 0,
      isLoading: isAuthLoading || (isAuthenticated && isLoading),
      error: isAuthenticated ? error : null,
      refreshNotifications,
      refreshUnreadCount,
      markAsRead,
      markAllAsRead,
    }),
    [
      notifications,
      total,
      unreadCount,
      isAuthLoading,
      isAuthenticated,
      isLoading,
      error,
      refreshNotifications,
      refreshUnreadCount,
      markAsRead,
      markAllAsRead,
    ],
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}
