import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Home,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Palette,
  BarChart3,
  FolderOpen,
  Image,
  Users,
  MessageCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

const Navbar = () => {
  const { user, profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [inquiriesCount, setInquiriesCount] = useState(0)

  const isDashboard = location.pathname.startsWith('/dashboard')

  // ---------------- Fetch Live Inquiries Count ----------------
  useEffect(() => {
    if (!user || !profile) {
      setInquiriesCount(0)
      return
    }

    const fetchInquiriesCount = async () => {
      const { count, error } = await supabase
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', profile.id)
        .eq('status', 'pending')

      if (error) {
        console.error('Failed to fetch inquiries count:', error)
        return
      }

      setInquiriesCount(count ?? 0)
    }

    fetchInquiriesCount()

    // Real-time subscription for pending inquiries
    const subscription = supabase
      .channel('public:inquiries')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inquiries',
          filter: `artist_id=eq.${profile.id},status=eq.pending`
        },
        () => fetchInquiriesCount()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [user, profile])

  // ---------------- Sign Out ----------------
  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
      toast.success('Signed out successfully')
    } catch (error) {
      toast.error('Error signing out')
    }
  }

  const publicNavItems = [{ name: 'Home', href: '/', icon: Home }]

  const dashboardNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'Artworks', href: '/dashboard/artworks', icon: Image },
    { name: 'Catalogues', href: '/dashboard/catalogues', icon: FolderOpen },
    { name: 'Contacts', href: '/dashboard/contacts', icon: Users },
    { name: 'Inquiries', href: '/dashboard/inquiries', icon: MessageCircle, showCount: true },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings }
  ]

  const navItems = isDashboard ? dashboardNavItems : publicNavItems
  const mobileBottomItems = navItems.slice(0, 5)

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <Palette className="h-8 w-8 text-primary-500" />
                <span className="text-xl font-bold text-gray-900">ArtFolio</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`relative flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                    {item.showCount && inquiriesCount > 0 && (
                      <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold leading-none text-white bg-red-600 rounded-full transform translate-x-2 -translate-y-1">
                        {inquiriesCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>

            {/* User Menu Desktop */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-sm text-gray-600">
                    Welcome, {profile?.name || user.email}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    Sign In
                  </Link>
                  <Link to="/register" className="btn-primary">
                    Sign Up
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center space-x-2">
              {isDashboard && user && (
                <Link
                  to="/dashboard/inquiries"
                  className="relative p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  title="Open Inquiries"
                >
                  <MessageCircle className="h-6 w-6" />
                  {inquiriesCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold leading-none text-white bg-red-600 rounded-full transform translate-x-1/2 -translate-y-1/2">
                      {inquiriesCount}
                    </span>
                  )}
                </Link>
              )}

              {(navItems.length > 5 || user) && (
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.slice(5).map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium ${
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                    {item.showCount && inquiriesCount > 0 && (
                      <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold leading-none text-white bg-red-600 rounded-full">
                        {inquiriesCount}
                      </span>
                    )}
                  </Link>
                )
              })}

              {user ? (
                <button
                  onClick={() => {
                    handleSignOut()
                    setIsMenuOpen(false)
                  }}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 w-full text-left"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <div className="px-3 py-2 space-y-2">
                  <Link
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full text-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full text-center btn-primary"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      {isDashboard && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <div className="flex items-center justify-around px-2 py-2">
            {mobileBottomItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors min-w-0 flex-1 ${
                    isActive ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className={`h-6 w-6 mb-1 ${isActive ? 'text-primary-600' : 'text-gray-500'}`} />
                  <span
                    className={`text-xs font-medium truncate ${
                      isActive ? 'text-primary-600' : 'text-gray-500'
                    }`}
                  >
                    {item.name}
                  </span>
                  {item.showCount && inquiriesCount > 0 && (
                    <span className="absolute top-1 right-6 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold leading-none text-white bg-red-600 rounded-full">
                      {inquiriesCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Bottom padding for mobile to account for fixed bottom nav */}
      {isDashboard && <div className="md:hidden h-16"></div>}
    </>
  )
}
export default Navbar
