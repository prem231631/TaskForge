
import { Navigate, Outlet } from 'react-router-dom'
import { LoaderCircle, Zap } from 'lucide-react'

import { useAuth } from '../context/useAuth'

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f7fa]">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#6755e8] text-white">
          <Zap size={25} fill="white" />
        </div>

        <LoaderCircle
          size={22}
          className="mt-6 animate-spin text-[#6755e8]"
        />

        <p className="mt-3 text-sm text-gray-500">
          Restoring your workspace...
        </p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
