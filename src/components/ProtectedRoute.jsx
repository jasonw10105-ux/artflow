import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-12 w-12 border-b-2 border-primary-500 rounded-full"></div></div>;

  if (!user || !profile) return <Navigate to="/login" replace />;

  if (!profile.password_set) return <Navigate to="/set-password" replace />;

  return children;
};

export default ProtectedRoute;
