import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import SetPassword from './pages/SetPassword'
import ArtworkManagement from './pages/ArtworkManagement'
import CatalogueManagement from './pages/CatalogueManagement'
import PublicCatalogue from './pages/PublicCatalogue'
import PrivateCatalogue from './pages/PrivateCatalogue'
import ArtistProfile from './pages/ArtistProfile'
import Settings from './pages/Settings'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-right" />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="set-password" element={<PublicRoute><SetPassword /></PublicRoute>} />
            <Route path="artist/:artistId" element={<ArtistProfile />} />
            <Route path="catalogue/:catalogueId" element={<PublicCatalogue />} />
            <Route path="private-catalogue/:catalogueId" element={<PrivateCatalogue />} />
          </Route>

          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="artworks" element={<ArtworkManagement />} />
            <Route path="catalogues" element={<CatalogueManagement />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </div>
    </AuthProvider>
  )
}

export default App
