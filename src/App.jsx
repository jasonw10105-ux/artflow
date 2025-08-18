// src/App.jsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext.js'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ArtworkManagement from './pages/ArtworkManagement.jsx'
import CatalogueManagement from './pages/CatalogueManagement.jsx'
import PublicCatalogue from './pages/PublicCatalogue.jsx'
import PrivateCatalogue from './pages/PrivateCatalogue.jsx'
import ArtistProfile from './pages/ArtistProfile.jsx'
import Settings from './pages/Settings.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import PublicRoute from './components/PublicRoute.jsx'

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

// ✅ Add default export
export default App
