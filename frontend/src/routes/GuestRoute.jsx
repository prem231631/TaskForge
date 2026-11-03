
import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

export default function GuestRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7fa]">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-violet-100 border-t-[#6755e8]" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
