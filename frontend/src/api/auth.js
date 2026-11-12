
import apiClient from './client'

export async function registerUser(userData) {
  const response = await apiClient.post('/auth/register', userData)
  return response.data
}

export async function verifyEmail(token) {
  const response = await apiClient.post('/auth/verify-email', {
    token,
  })

  return response.data
}

export async function resendVerificationEmail(email) {
  const response = await apiClient.post('/auth/resend-verification', {
    email,
  })

  return response.data
}

export async function loginUser(credentials) {
  const response = await apiClient.post('/auth/login', credentials)
  return response.data
}

export async function getCurrentUser() {
  const response = await apiClient.get('/auth/me')
  return response.data
}

export async function updateCurrentUser(profileData) {
  const response = await apiClient.patch('/auth/me', profileData)
  return response.data
}

export async function changeCurrentUserPassword(passwordData) {
  const response = await apiClient.post(
    '/auth/change-password',
    passwordData,
  )

  return response.data
}
