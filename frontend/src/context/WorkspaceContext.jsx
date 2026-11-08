
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  createWorkspace as createWorkspaceRequest,
  deleteWorkspace as deleteWorkspaceRequest,
  getWorkspaces,
  updateWorkspace as updateWorkspaceRequest,
} from '../api/workspaces'

import { useAuth } from './useAuth'
import { WorkspaceContext } from './workspace-context'

const WORKSPACE_STORAGE_KEY = 'taskforge_selected_workspace'

export function WorkspaceProvider({ children }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()

  const [workspaces, setWorkspaces] = useState([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(() => {
    try {
      return sessionStorage.getItem(WORKSPACE_STORAGE_KEY)
    } catch {
      return null
    }
  })

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const selectedWorkspace = useMemo(
    () =>
      workspaces.find(
        (workspace) =>
          String(workspace.id) === String(selectedWorkspaceId),
      ) || null,
    [workspaces, selectedWorkspaceId],
  )

  const selectWorkspace = useCallback((workspaceId) => {
    const nextId = workspaceId ? String(workspaceId) : null

    setSelectedWorkspaceId(nextId)

    try {
      if (nextId) {
        sessionStorage.setItem(WORKSPACE_STORAGE_KEY, nextId)
      } else {
        sessionStorage.removeItem(WORKSPACE_STORAGE_KEY)
      }
    } catch {
      // Workspace selection remains available for the current session.
    }
  }, [])

  const refreshWorkspaces = useCallback(async () => {
    if (!isAuthenticated) {
      setWorkspaces([])
      selectWorkspace(null)
      setIsLoading(false)
      return []
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await getWorkspaces()
      const workspaceList = Array.isArray(data) ? data : []

      setWorkspaces(workspaceList)

      const savedId = selectedWorkspaceId
      const savedWorkspaceExists = workspaceList.some(
        (workspace) => String(workspace.id) === String(savedId),
      )

      if (savedWorkspaceExists) {
        selectWorkspace(savedId)
      } else {
        selectWorkspace(workspaceList[0]?.id ?? null)
      }

      return workspaceList
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          'Unable to load your workspaces.',
      )
      throw requestError
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, selectedWorkspaceId, selectWorkspace])

  useEffect(() => {
    if (isAuthLoading) {
      return
    }

    if (!isAuthenticated) {
      setWorkspaces([])
      selectWorkspace(null)
      setError(null)
      setIsLoading(false)
      return
    }

    let isMounted = true

    async function loadWorkspaces() {
      setIsLoading(true)
      setError(null)

      try {
        const data = await getWorkspaces()
        const workspaceList = Array.isArray(data) ? data : []

        if (!isMounted) {
          return
        }

        setWorkspaces(workspaceList)

        const savedWorkspaceExists = workspaceList.some(
          (workspace) =>
            String(workspace.id) === String(selectedWorkspaceId),
        )

        const nextWorkspaceId = savedWorkspaceExists
          ? selectedWorkspaceId
          : workspaceList[0]?.id ?? null

        setSelectedWorkspaceId(
          nextWorkspaceId ? String(nextWorkspaceId) : null,
        )

        try {
          if (nextWorkspaceId) {
            sessionStorage.setItem(
              WORKSPACE_STORAGE_KEY,
              String(nextWorkspaceId),
            )
          } else {
            sessionStorage.removeItem(WORKSPACE_STORAGE_KEY)
          }
        } catch {
          // Ignore unavailable session storage.
        }
      } catch (requestError) {
        if (isMounted) {
          setError(
            requestError.response?.data?.detail ||
              'Unable to load your workspaces.',
          )
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadWorkspaces()

    return () => {
      isMounted = false
    }
  }, [isAuthenticated, isAuthLoading, selectedWorkspaceId, selectWorkspace])

  const createWorkspace = useCallback(
    async (workspaceData) => {
      setError(null)

      const newWorkspace = await createWorkspaceRequest(workspaceData)

      setWorkspaces((current) => [newWorkspace, ...current])
      selectWorkspace(newWorkspace.id)

      return newWorkspace
    },
    [selectWorkspace],
  )

  const updateWorkspace = useCallback(async (workspaceId, workspaceData) => {
    setError(null)

    const updatedWorkspace = await updateWorkspaceRequest(
      workspaceId,
      workspaceData,
    )

    setWorkspaces((current) =>
      current.map((workspace) =>
        workspace.id === workspaceId
          ? { ...workspace, ...updatedWorkspace }
          : workspace,
      ),
    )

    return updatedWorkspace
  }, [])

  const deleteWorkspace = useCallback(
    async (workspaceId) => {
      setError(null)

      await deleteWorkspaceRequest(workspaceId)

      const remainingWorkspaces = workspaces.filter(
        (workspace) => workspace.id !== workspaceId,
      )

      setWorkspaces(remainingWorkspaces)

      if (String(selectedWorkspaceId) === String(workspaceId)) {
        selectWorkspace(remainingWorkspaces[0]?.id ?? null)
      }
    },
    [workspaces, selectedWorkspaceId, selectWorkspace],
  )

  const value = useMemo(
    () => ({
      workspaces,
      selectedWorkspace,
      selectedWorkspaceId,
      isLoading,
      error,
      selectWorkspace,
      refreshWorkspaces,
      createWorkspace,
      updateWorkspace,
      deleteWorkspace,
    }),
    [
      workspaces,
      selectedWorkspace,
      selectedWorkspaceId,
      isLoading,
      error,
      selectWorkspace,
      refreshWorkspaces,
      createWorkspace,
      updateWorkspace,
      deleteWorkspace,
    ],
  )

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}
