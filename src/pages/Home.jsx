// src/pages/Home.jsx
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Palette, Eye, Download, Users, ArrowRight } from 'lucide-react'

const Home = () => {
  const [featuredArtists, setFeaturedArtists] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFeaturedArtists()
  }, [])

  const fetchFeaturedArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          bio,
          artworks (
            id,
            title,
            image_url
          )
        `)
        .eq('user_type', 'artist')
        .limit(6)

      if (error) throw error

      // Convert storage paths to public URLs
      const artistsWithPublicUrls = data.map(artist => {
        const artworksWithUrls = artist.artworks.map(work => ({
          ...work,
          public_url: work.image_url
            ? supabase.storage.from('works').getPublicUrl(work.image_url).publicUrl
            : null
        }))
        return { ...artist, artworks: artworksWithUrls }
      })

      setFeaturedArtists(artistsWithPublicUrls)
    } catch (error) {
      console.error('Error fetching artists:', error)
    } finally {
      setLoading(false)
    }
  }

  const features = [
    {
      icon: Palette,
      title: 'Showcase Your Art',
      description: 'Upload and organize your artwork in beautiful digital galleries'
    },
    {
      icon: Eye,
      title: 'Create Catalogues',
      description: 'Build professional catalogues with public and private sharing options'
    },
    {
      icon: Download,
      title: 'Export to PDF',
      description: 'Generate downloadable PDF catalogues for clients and exhibitions'
    },
    {
      icon: Users,
      title: 'Connect with Collectors',
      description: 'Receive inquiries and manage sales directly through the platform'
    }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-blue-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Showcase Your Art to the World
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Create stunning digital portfolios, manage your artwork, build professional catalogues, 
            and connect with collectors all in one platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="btn-primary text-lg px-8 py-3 flex items-center justify-center"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Your Art Career
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Professional tools designed specifically for artists to showcase, sell, and manage their work.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="text-center">
                  <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-8 w-8 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Featured Artists Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Featured Artists
            </h2>
            <p className="text-lg text-gray-600">
              Discover amazing artists and their work on our platform
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="w-full h-48 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredArtists.map((artist) => (
                <Link
                  key={artist.id}
                  to={`/artist/${artist.id}`}
                  className="card p-6 hover:shadow-lg transition-shadow rounded-lg bg-white"
                >
                  {artist.artworks?.[0]?.public_url ? (
                    <img
                      src={artist.artworks[0].public_url}
                      alt={artist.artworks[0].title}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                      <Palette className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {artist.name || 'Artist'}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {artist.bio || 'Exploring creativity through art'}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Showcase Your Art?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of artists who are already using ArtFolio to grow their careers 
            and connect with collectors worldwide.
          </p>
          <Link
            to="/register"
            className="bg-white text-primary-600 hover:bg-gray-100 font-medium py-3 px-8 rounded-lg text-lg transition-colors inline-flex items-center"
          >
            Start Your Free Account
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}

export default Home
