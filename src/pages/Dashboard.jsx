import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  Image, 
  FolderOpen, 
  Eye, 
  MessageSquare, 
  TrendingUp,
  Plus,
  BarChart3
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const Dashboard = () => {
  const { profile } = useAuth()
  const [stats, setStats] = useState({
    totalArtworks: 0,
    totalCatalogues: 0,
    totalViews: 0,
    totalInquiries: 0,
    totalSales: 0,
    totalRevenue: 0
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [viewsData, setViewsData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) fetchDashboardData()
  }, [profile])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchStats(), fetchRecentActivity(), fetchViewsData()])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const [
        { count: artworksCount },
        { count: cataloguesCount },
        { data: inquiriesData },
        { data: salesData }
      ] = await Promise.all([
        supabase.from('works').select('*', { count: 'exact', head: true }).eq('artist_id', profile.id),
        supabase.from('catalogues').select('*', { count: 'exact', head: true }).eq('artist_id', profile.id),
        supabase.from('inquiries').select('*').eq('artist_id', profile.id),
        supabase.from('sales').select('price').eq('artist_id', profile.id)
      ])

      const totalRevenue = salesData?.reduce((sum, sale) => sum + parseFloat(sale.price || 0), 0) || 0
      const totalViewsData = await supabase.from('works').select('views').eq('artist_id', profile.id)
      const totalViews = totalViewsData.data?.reduce((sum, work) => sum + (work.views || 0), 0) || 0

      setStats({
        totalArtworks: artworksCount || 0,
        totalCatalogues: cataloguesCount || 0,
        totalViews,
        totalInquiries: inquiriesData?.length || 0,
        totalSales: salesData?.length || 0,
        totalRevenue
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      const { data: inquiries } = await supabase
        .from('inquiries')
        .select(`
          *,
          works(title)
        `)
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5)

      const activity = inquiries?.map(inquiry => ({
        id: inquiry.id,
        message: `New inquiry from ${inquiry.sender_email} about "${inquiry.works?.title}"`,
        time: new Date(inquiry.created_at).toLocaleString()
      })) || []

      setRecentActivity(activity)
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    }
  }

  const fetchViewsData = async () => {
    try {
      const { data: works } = await supabase
        .from('works')
        .select('created_at, views')
        .eq('artist_id', profile.id)

      if (works) {
        const dayMap = {}
        const today = new Date()
        for (let i = 6; i >= 0; i--) {
          const day = new Date(today)
          day.setDate(today.getDate() - i)
          const key = day.toLocaleDateString('en-US', { weekday: 'short' })
          dayMap[key] = 0
        }

        works.forEach(work => {
          const dayKey = new Date(work.created_at).toLocaleDateString('en-US', { weekday: 'short' })
          if (dayMap[dayKey] !== undefined) dayMap[dayKey] += work.views || 0
        })

        const chartData = Object.entries(dayMap).map(([name, views]) => ({ name, views }))
        setViewsData(chartData)
      }
    } catch (error) {
      console.error('Error fetching views data:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const statCards = [
    { title: 'Total Artworks', value: stats.totalArtworks, icon: Image, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { title: 'Catalogues', value: stats.totalCatalogues, icon: FolderOpen, color: 'text-green-600', bgColor: 'bg-green-100' },
    { title: 'Profile Views', value: stats.totalViews, icon: Eye, color: 'text-purple-600', bgColor: 'bg-purple-100' },
    { title: 'Inquiries', value: stats.totalInquiries, icon: MessageSquare, color: 'text-orange-600', bgColor: 'bg-orange-100' }
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {profile?.name}!
        </h1>
        <p className="text-gray-600">
          Here's an overview of your portfolio.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="card p-6 shadow-sm rounded-lg border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} ${stat.color} p-3 rounded-full`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Views Chart */}
        <div className="card p-6 shadow-sm rounded-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Profile Views (Last 7 Days)</h3>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={viewsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div className="card p-6 shadow-sm rounded-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map(act => (
                <div key={act.id} className="flex items-start space-x-3">
                  <div className="bg-orange-100 rounded-full p-1">
                    <MessageSquare className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{act.message}</p>
                    <p className="text-xs text-gray-500">{act.time}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No recent activity</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6 shadow-sm rounded-lg border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link to="/dashboard/artworks" className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Plus className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Add Artwork</p>
              <p className="text-sm text-gray-500">Upload new pieces to your portfolio</p>
            </div>
          </Link>

          <Link to="/dashboard/catalogues" className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="bg-green-100 p-2 rounded-lg">
              <FolderOpen className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Create Catalogue</p>
              <p className="text-sm text-gray-500">Organize your work into collections</p>
            </div>
          </Link>

          <Link to="/dashboard/analytics" className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="bg-purple-100 p-2 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">View Analytics</p>
              <p className="text-sm text-gray-500">See detailed performance metrics</p>
            </div>
          </Link>

          <Link to={`/artist/${profile.id}`} className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Eye className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">View Public Profile</p>
              <p className="text-sm text-gray-500">See your portfolio as collectors see it</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
