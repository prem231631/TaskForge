
import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '../context/useAuth'
import './GuestRoute.css'

export default function GuestRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="route-loading">
        <span className="route-loading__spinner" />
        <p>Preparing TaskForge...</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
