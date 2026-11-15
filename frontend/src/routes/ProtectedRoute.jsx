
import { Navigate, Outlet } from 'react-router-dom'
import { LoaderCircle, Zap } from 'lucide-react'

import { useAuth } from '../context/useAuth'
import './ProtectedRoute.css'

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="protected-loading">
        <div className="protected-loading__brand">
          <Zap size={25} fill="currentColor" />
        </div>

        <LoaderCircle
          size={23}
          className="protected-loading__spinner"
        />

        <p>Restoring your workspace...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
