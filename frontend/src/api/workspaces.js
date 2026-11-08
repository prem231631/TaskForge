
import apiClient from './client'

export async function getWorkspaces() {
  const response = await apiClient.get('/workspaces')
  return response.data
}

export async function getWorkspace(workspaceId) {
  const response = await apiClient.get(`/workspaces/${workspaceId}`)
  return response.data
}

export async function createWorkspace(workspaceData) {
  const response = await apiClient.post('/workspaces', workspaceData)
  return response.data
}

export async function updateWorkspace(workspaceId, workspaceData) {
  const response = await apiClient.patch(
    `/workspaces/${workspaceId}`,
    workspaceData,
  )

  return response.data
}

export async function deleteWorkspace(workspaceId) {
  const response = await apiClient.delete(`/workspaces/${workspaceId}`)
  return response.data
}

export async function getWorkspaceMembers(workspaceId) {
  const response = await apiClient.get(
    `/workspaces/${workspaceId}/members`,
  )

  return response.data
}

export async function addWorkspaceMember(workspaceId, email) {
  const response = await apiClient.post(
    `/workspaces/${workspaceId}/members`,
    { email },
  )

  return response.data
}

export async function removeWorkspaceMember(workspaceId, userId) {
  const response = await apiClient.delete(
    `/workspaces/${workspaceId}/members/${userId}`,
  )

  return response.data
}
