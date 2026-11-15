
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  getCurrentUser,
  loginUser,
  registerUser,
  updateCurrentUser,
} from '../api/auth'

import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from '../api/client'

import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const logout = useCallback(() => {
    clearAccessToken()
    setUser(null)
  }, [])

  const login = useCallback(async (credentials) => {
    const data = await loginUser(credentials)

    if (!data.access_token) {
      throw new Error('The server did not return an access token.')
    }

    setAccessToken(data.access_token)

    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      return currentUser
    } catch (error) {
      clearAccessToken()
      setUser(null)
      throw error
    }
  }, [])

  const register = useCallback(async (userData) => {
    return registerUser(userData)
  }, [])

  const updateProfile = useCallback(async (profileData) => {
    const updatedUser = await updateCurrentUser(profileData)
    setUser(updatedUser)
    return updatedUser
  }, [])

  useEffect(() => {
    let isMounted = true

    async function restoreSession() {
      const token = getAccessToken()

      if (!token) {
        if (isMounted) {
          setIsLoading(false)
        }
        return
      }

      try {
        const currentUser = await getCurrentUser()

        if (isMounted) {
          setUser(currentUser)
        }
      } catch {
        clearAccessToken()

        if (isMounted) {
          setUser(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    restoreSession()

    return () => {
      isMounted = false
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      updateProfile,
    }),
    [
      user,
      isLoading,
      login,
      register,
      logout,
      updateProfile,
    ],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
