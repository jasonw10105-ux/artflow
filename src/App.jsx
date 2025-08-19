import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ArtworkList from './pages/ArtworkList'
import ArtworkCreate from './pages/ArtworkCreate'
import ArtworkEdit from './pages/ArtworkEdit'
import CatalogueManagement from './pages/CatalogueManagement'
import PublicCatalogue from './pages/PublicCatalogue'
import PrivateCatalogue from './pages/PrivateCatalogue'
import ArtistProfile from './pages/ArtistProfile'
import SetPassword from './pages/SetPassword'
import Settings from './pages/Settings'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import AuthCallback from './pages/AuthCallback'

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
            <Route path="auth/callback" element={<PublicRoute><AuthCallback /></PublicRoute>} />
            
            {/* Artist profile */}
            <Route path="artist/:code/:slug" element={<ArtistProfile />} />
            
            {/* Public catalogues */}
            <Route path="catalogue/:catalogueId" element={<PublicCatalogue />} />
            <Route path="private-catalogue/:catalogueId" element={<PrivateCatalogue />} />
          </Route>

          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            
            {/* Artwork routes */}
            <Route path="artworks" element={<ArtworkList />} />
            <Route path="artworks/create" element={<ArtworkCreate />} />
            <Route path="artworks/edit/:artworkId" element={<ArtworkEdit />} />

            {/* Catalogue management */}
            <Route path="catalogues" element={<CatalogueManagement />} />
            
            {/* Settings */}
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </div>
    </AuthProvider>
  )
}

export default App
