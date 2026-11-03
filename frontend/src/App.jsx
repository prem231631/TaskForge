
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'

import ProtectedRoute from './routes/ProtectedRoute'
import GuestRoute from './routes/GuestRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes for guests */}
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Protected routes for authenticated users */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
        </Route>

        {/* Unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
