
import apiClient from './client'

const getTasksPath = (workspaceId) =>
  `/workspaces/${workspaceId}/tasks`

export async function getTasks(workspaceId, params = {}) {
  const response = await apiClient.get(getTasksPath(workspaceId), {
    params,
  })

  return response.data
}

export async function getTask(workspaceId, taskId) {
  const response = await apiClient.get(
    `${getTasksPath(workspaceId)}/${taskId}`,
  )

  return response.data
}

export async function createTask(workspaceId, taskData) {
  const response = await apiClient.post(
    getTasksPath(workspaceId),
    taskData,
  )

  return response.data
}

export async function updateTask(workspaceId, taskId, taskData) {
  const response = await apiClient.patch(
    `${getTasksPath(workspaceId)}/${taskId}`,
    taskData,
  )

  return response.data
}

export async function deleteTask(workspaceId, taskId) {
  const response = await apiClient.delete(
    `${getTasksPath(workspaceId)}/${taskId}`,
  )

  return response.data
}
