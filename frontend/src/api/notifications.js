
import apiClient from './client'

export async function getNotifications(params = {}) {
  const response = await apiClient.get('/notifications', {
    params,
  })

  return response.data
}

export async function getUnreadNotificationCount() {
  const response = await apiClient.get('/notifications/unread-count')

  return response.data
}

export async function markNotificationAsRead(notificationId) {
  const response = await apiClient.patch(
    `/notifications/${notificationId}/read`,
  )

  return response.data
}

export async function markAllNotificationsAsRead() {
  const response = await apiClient.patch('/notifications/read-all')

  return response.data
}
