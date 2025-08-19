import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../supabaseClient"
import { Chart, Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import {
  Plus,
  ImageIcon,
  BookOpen,
  EnvelopeOpen,
  Users,
} from "lucide-react"

function Dashboard() {
  const [artworks, setArtworks] = useState([])
  const [catalogues, setCatalogues] = useState([])
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const { data: artworksData, error: artworksError } = await supabase
          .from("artworks")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5)
        if (artworksError) throw artworksError

        const { data: cataloguesData, error: cataloguesError } = await supabase
          .from("catalogues")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5)
        if (cataloguesError) throw cataloguesError

        const { data: inquiriesData, error: inquiriesError } = await supabase
          .from("inquiries")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5)
        if (inquiriesError) throw inquiriesError

        setArtworks(artworksData)
        setCatalogues(cataloguesData)
        setInquiries(inquiriesData)
        setError(null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Example simple chart data from artworks count over days (you can customize)
  const chartData = artworks
    .reduce((acc, artwork) => {
      const date = new Date(artwork.created_at).toLocaleDateString()
      const found = acc.find((item) => item.date === date)
      if (found) found.count += 1
      else acc.push({ date, count: 1 })
      return acc
    }, [])
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="stat-card flex items-center space-x-4">
              <div className="stat-icon bg-primary-500 text-white">
                <ImageIcon size={24} />
              </div>
              <div>
                <p className="stat-title">Artworks</p>
                <p className="stat-value">{artworks.length}</p>
              </div>
            </div>

            <div className="stat-card flex items-center space-x-4">
              <div className="stat-icon bg-secondary-500 text-white">
                <BookOpen size={24} />
              </div>
              <div>
                <p className="stat-title">Catalogues</p>
                <p className="stat-value">{catalogues.length}</p>
              </div>
            </div>

            <div className="stat-card flex items-center space-x-4">
              <div className="stat-icon bg-green-500 text-white">
                <EnvelopeOpen size={24} />
              </div>
              <div>
                <p className="stat-title">Inquiries</p>
                <p className="stat-value">{inquiries.length}</p>
              </div>
            </div>

            <div className="stat-card flex items-center space-x-4">
              <div className="stat-icon bg-purple-500 text-white">
                <Users size={24} />
              </div>
              <div>
                <p className="stat-title">Visitors</p>
                <p className="stat-value">--</p>
              </div>
            </div>
          </section>

          <section className="card mb-8">
            <h2 className="text-xl font-semibold mb-4">Artworks Added Over Time</h2>
            {chartData.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorCount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500">No artwork data available.</p>
            )}
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card">
              <h3 className="font-semibold mb-2">Recent Artworks</h3>
              {artworks.length ? (
                <ul className="space-y-3 max-h-60 overflow-y-auto">
                  {artworks.map((artwork) => (
                    <li key={artwork.id} className="flex items-center space-x-3">
                      {artwork.image_url ? (
                        <img
                          src={artwork.image_url}
                          alt={artwork.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                          <ImageIcon size={20} className="text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{artwork.title}</p>
                        <p className="text-sm text-gray-500">{new Date(artwork.created_at).toLocaleDateString()}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No artworks found.</p>
              )}
            </div>

            <div className="card">
              <h3 className="font-semibold mb-2">Recent Catalogues</h3>
              {catalogues.length ? (
                <ul className="space-y-3 max-h-60 overflow-y-auto">
                  {catalogues.map((catalogue) => (
                    <li key={catalogue.id} className="flex items-center space-x-3">
                      <BookOpen size={32} className="text-primary-500" />
                      <div>
                        <p className="font-medium">{catalogue.title}</p>
                        <p className="text-sm text-gray-500">{new Date(catalogue.created_at).toLocaleDateString()}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No catalogues found.</p>
              )}
            </div>

            <div className="card">
              <h3 className="font-semibold mb-2">Recent Inquiries</h3>
              {inquiries.length ? (
                <ul className="space-y-3 max-h-60 overflow-y-auto">
                  {inquiries.map((inquiry) => (
                    <li key={inquiry.id} className="flex flex-col space-y-1">
                      <p className="font-medium">{inquiry.subject || "No Subject"}</p>
                      <p className="text-sm text-gray-500">
                        From: {inquiry.email || "Unknown"} | {new Date(inquiry.created_at).toLocaleDateString()}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No inquiries found.</p>
              )}
            </div>
          </section>

          <section className="flex flex-wrap gap-4 mt-8">
            <Link to="/artworks/new" className="btn-primary inline-flex items-center">
              <Plus size={16} className="mr-2" />
              Add Artwork
            </Link>
            <Link to="/catalogues/new" className="btn-secondary inline-flex items-center">
              <Plus size={16} className="mr-2" />
              Create Catalogue
            </Link>
          </section>
        </>
      )}
    </div>
  )
}

export default Dashboard