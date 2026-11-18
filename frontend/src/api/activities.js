import apiClient from './client'

export async function getWorkspaceActivities(workspaceId, params = {}) {
  const response = await apiClient.get(
    `/workspaces/${workspaceId}/activities`,
    { params },
  )

  return response.data
}