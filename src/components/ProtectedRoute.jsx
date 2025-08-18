import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ProtectedRoute = () => {
  const { user, profile, loading } = useAuth()

  // While auth state is loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  // Not logged in at all
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // User exists but profile is still being fetched
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading profile...</p>
      </div>
    )
  }

  // Logged in via magic link but hasn't set password yet
  if (!profile.password_set) {
    return <Navigate to="/set-password" replace />
  }

  // Fully authenticated and profile ready
  return <Outlet />
}

export default ProtectedRoute
