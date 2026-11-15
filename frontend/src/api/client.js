
import axios from 'axios'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
).replace(/\/+$/, '')

export const TOKEN_KEY = 'taskforge_access_token'

export function getAccessToken() {
  const persistentToken = localStorage.getItem(TOKEN_KEY)

  if (persistentToken) {
    return persistentToken
  }

  // Migrate an existing sessionStorage token to localStorage.
  const sessionToken = sessionStorage.getItem(TOKEN_KEY)

  if (sessionToken) {
    localStorage.setItem(TOKEN_KEY, sessionToken)
    sessionStorage.removeItem(TOKEN_KEY)
    return sessionToken
  }

  return null
}

export function setAccessToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
  sessionStorage.removeItem(TOKEN_KEY)
}

export function clearAccessToken() {
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
})

apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken()

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error),
)

export default apiClient
