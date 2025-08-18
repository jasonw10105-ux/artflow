import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  User, 
  Mail, 
  Lock, 
  BarChart3, 
  Eye,
  MessageSquare,
  DollarSign,
  Save,
  Calendar
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import toast from 'react-hot-toast'

const Settings = () => {
  const { profile, updateProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [profileData, setProfileData] = useState({
    name: '',
    bio: '',
    email: ''
  })
  const [analytics, setAnalytics] = useState({
    profileViews: [],
    catalogueViews: [],
    inquiries: [],
    totalStats: {
      profileViews: 0,
      catalogueViews: 0,
      inquiries: 0,
      artworks: 0
    }
  })
  const [loading, setLoading] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      setProfileData({
        name: profile.name || '',
        bio: profile.bio || '',
        email: profile.email || ''
      })
      fetchAnalytics()
    }
  }, [profile])

  const fetchAnalytics = async () => {
    try {
      // Fetch profile views
      const { data: profileViews } = await supabase
        .from('profile_views')
        .select('viewed_at')
        .eq('artist_id', profile.id)
        .order('viewed_at', { ascending: false })

      // Fetch catalogue views
      const { data: catalogueViews } = await supabase
        .from('catalogue_views')
        .select(`
          viewed_at,
          catalogues(title)
        `)
        .eq('catalogues.artist_id', profile.id)
        .order('viewed_at', { ascending: false })

      // Fetch inquiries
      const { data: inquiries } = await supabase
        .from('inquiries')
        .select(`
          created_at,
          message,
          profiles(name)
        `)
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })

      // Fetch artworks count
      const { count: artworksCount } = await supabase
        .from('artworks')
        .select('*', { count: 'exact', head: true })
        .eq('artist_id', profile.id)

      // Process data for charts
      const processViewsData = (views, days = 7) => {
        const today = new Date()
        const data = []
        
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(today)
          date.setDate(date.getDate() - i)
          const dateStr = date.toISOString().split('T')[0]
          
          const viewsForDay = views?.filter(view => 
            view.viewed_at.startsWith(dateStr)
          ).length || 0
          
          data.push({
            date: date.toLocaleDateString('en-US', { weekday: 'short' }),
            views: viewsForDay
          })
        }
        
        return data
      }

      const processInquiriesData = (inquiries, days = 30) => {
        const today = new Date()
        const data = []
        
        for (let i = days - 1; i >= 0; i -= 7) {
          const endDate = new Date(today)
          endDate.setDate(endDate.getDate() - i)
          const startDate = new Date(endDate)
          startDate.setDate(startDate.getDate() - 6)
          
          const inquiriesForWeek = inquiries?.filter(inquiry => {
            const inquiryDate = new Date(inquiry.created_at)
            return inquiryDate >= startDate && inquiryDate <= endDate
          }).length || 0
          
          data.push({
            week: `${startDate.getMonth() + 1}/${startDate.getDate()}`,
            inquiries: inquiriesForWeek
          })
        }
        
        return data.reverse()
      }

      setAnalytics({
        profileViews: processViewsData(profileViews),
        catalogueViews: processViewsData(catalogueViews),
        inquiries: processInquiriesData(inquiries),
        totalStats: {
          profileViews: profileViews?.length || 0,
          catalogueViews: catalogueViews?.length || 0,
          inquiries: inquiries?.length || 0,
          artworks: artworksCount || 0
        }
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await updateProfile(profileData)
      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'analytics', name: 'Analytics', icon: BarChart3 }
  ]

  const statCards = [
    {
      title: 'Profile Views',
      value: analytics.totalStats.profileViews,
      icon: Eye,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Catalogue Views',
      value: analytics.totalStats.catalogueViews,
      icon: Eye,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Total Inquiries',
      value: analytics.totalStats.inquiries,
      icon: MessageSquare,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'Artworks',
      value: analytics.totalStats.artworks,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>
            
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={profileData.name}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleInputChange}
                  className="input"
                  required
                  disabled
                />
                <p className="mt-1 text-sm text-gray-500">
                  Email cannot be changed. Contact support if you need to update your email.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={profileData.bio}
                  onChange={handleInputChange}
                  className="input"
                  rows="4"
                  placeholder="Tell people about yourself and your artistic style..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div>
          {analyticsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {statCards.map((stat, index) => {
                  const Icon = stat.icon
                  return (
                    <div key={index} className="card p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-1">
                            {stat.title}
                          </p>
                          <p className="text-2xl font-bold text-gray-900">
                            {stat.value}
                          </p>
                        </div>
                        <div className={`${stat.bgColor} ${stat.color} p-3 rounded-full`}>
                          <Icon className="h-6 w-6" />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Profile Views Chart */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Profile Views (Last 7 Days)
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={analytics.profileViews}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="views" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Inquiries Chart */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Inquiries (Last 4 Weeks)
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={analytics.inquiries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="inquiries" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Performance Summary */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Performance Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">This Week</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Profile Views:</span>
                        <span className="font-medium">
                          {analytics.profileViews.reduce((sum, day) => sum + day.views, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Catalogue Views:</span>
                        <span className="font-medium">
                          {analytics.catalogueViews.reduce((sum, day) => sum + day.views, 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Engagement</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg. Daily Views:</span>
                        <span className="font-medium">
                          {Math.round(analytics.profileViews.reduce((sum, day) => sum + day.views, 0) / 7)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Inquiry Rate:</span>
                        <span className="font-medium">
                          {analytics.totalStats.profileViews > 0 
                            ? Math.round((analytics.totalStats.inquiries / analytics.totalStats.profileViews) * 100)
                            : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Growth</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Artworks:</span>
                        <span className="font-medium">{analytics.totalStats.artworks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Inquiries:</span>
                        <span className="font-medium">{analytics.totalStats.inquiries}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default Settings