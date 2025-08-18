import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ProtectedRoute = () => {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!user) {
    // Not logged in
    return <Navigate to="/login" replace />
  }

  if (!profile?.password_set) {
    // Logged in via magic link but hasn't set password
    return <Navigate to="/set-password" replace />
  }

  // Fully logged in with password set
  return <Outlet />
}

export default ProtectedRoute
