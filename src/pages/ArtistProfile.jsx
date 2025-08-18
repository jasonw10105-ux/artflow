import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  MessageSquare, 
  Eye, 
  Calendar,
  Palette,
  User,
  ArrowLeft,
  ExternalLink,
  FolderOpen,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'

const ArtistProfile = () => {
  const { artistId } = useParams()
  const { user } = useAuth()
  const [artist, setArtist] = useState(null)
  const [artworks, setArtworks] = useState([])
  const [catalogues, setCatalogues] = useState([])
  const [loading, setLoading] = useState(true)
  const [inquiryModal, setInquiryModal] = useState(false)
  const [inquiryForm, setInquiryForm] = useState({
    email: '',
    message: ''
  })

  useEffect(() => {
    fetchArtistData()
    trackProfileView()
  }, [artistId])

  const fetchArtistData = async () => {
    try {
      // Fetch artist profile
      const { data: artistData, error: artistError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', artistId)
        .eq('user_type', 'artist')
        .single()

      if (artistError) throw artistError

      // Fetch artworks
      const { data: artworksData, error: artworksError } = await supabase
        .from('artworks')
        .select('*')
        .eq('artist_id', artistId)
        .order('created_at', { ascending: false })
        .limit(12)

      if (artworksError) throw artworksError

      // Fetch public catalogues
      const { data: cataloguesData, error: cataloguesError } = await supabase
        .from('catalogues')
        .select(`
          *,
          catalogue_artworks (
            artworks(id, image_url, title)
          )
        `)
        .eq('artist_id', artistId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      if (cataloguesError) throw cataloguesError

      // Ensure catalogue_artworks is always an array
      const safeCatalogues = (cataloguesData || []).map(cat => ({
        ...cat,
        catalogue_artworks: cat.catalogue_artworks || []
      }))

      setArtist(artistData)
      setArtworks(artworksData || [])
      setCatalogues(safeCatalogues)
    } catch (error) {
      console.error('Error fetching artist data:', error)
      toast.error('Artist not found')
    } finally {
      setLoading(false)
    }
  }

  const trackProfileView = async () => {
    try {
      await supabase
        .from('profile_views')
        .insert([{
          artist_id: artistId,
          viewer_ip: 'anonymous',
          viewed_at: new Date().toISOString()
        }])
    } catch (error) {
      console.log('View tracking failed:', error)
    }
  }

  const handleInquirySubmit = async (e) => {
    e.preventDefault()
    
    if (!user) {
      toast.error('Please sign up or log in to send inquiries')
      return
    }

    try {
      const { error } = await supabase
        .from('inquiries')
        .insert([{
          artist_id: artistId,
          collector_id: user.id,
          message: inquiryForm.message,
          contact_email: inquiryForm.email || user.email
        }])

      if (error) throw error

      toast.success('Inquiry sent successfully!')
      setInquiryModal(false)
      setInquiryForm({ email: '', message: '' })
    } catch (error) {
      console.error('Error sending inquiry:', error)
      toast.error('Failed to send inquiry')
    }
  }

  const openInquiryModal = () => {
    setInquiryForm({
      email: user?.email || '',
      message: `Hi ${artist?.name}, I'm interested in your work and would like to learn more.`
    })
    setInquiryModal(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!artist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Artist Not Found</h1>
          <p className="text-gray-600 mb-6">This artist profile may not exist or may no longer be available.</p>
          <Link to="/" className="btn-primary">
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Home
            </Link>
            
            <button
              onClick={openInquiryModal}
              className="btn-primary flex items-center space-x-2"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Contact Artist</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Artist Info */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-start space-x-6">
            <div className="bg-gray-200 rounded-full w-24 h-24 flex items-center justify-center">
              <User className="h-12 w-12 text-gray-400" />
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{artist.name}</h1>
              <p className="text-gray-600 mb-4">{artist.bio}</p>
              
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <Palette className="h-4 w-4 mr-1" />
                  <span>{artworks.length} artworks</span>
                </div>
                <div className="flex items-center">
                  <FolderOpen className="h-4 w-4 mr-1" />
                  <span>{catalogues.length} catalogues</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>Joined {new Date(artist.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Catalogues Section */}
        {catalogues.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Public Catalogues</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {catalogues.map((catalogue) => (
                <Link
                  key={catalogue.id}
                  to={`/catalogue/${catalogue.id}`}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="grid grid-cols-3 gap-1 h-32">
                    {catalogue.catalogue_artworks.slice(0, 3).map((ca, index) => (
                      <img
                        key={index}
                        src={ca.artworks?.image_url || '/placeholder.png'}
                        alt={ca.artworks?.title || 'Artwork'}
                        className="w-full h-full object-cover"
                      />
                    ))}
                    {catalogue.catalogue_artworks.length < 3 &&
                      [...Array(3 - catalogue.catalogue_artworks.length)].map((_, index) => (
                        <div key={index} className="bg-gray-100 flex items-center justify-center">
                          <Palette className="h-6 w-6 text-gray-400" />
                        </div>
                      ))
                    }
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{catalogue.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{catalogue.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{catalogue.catalogue_artworks.length || 0} artworks</span>
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Artworks Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Artworks</h2>
          {artworks.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg">
              <Palette className="h-24 w-24 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No artworks available to display</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {artworks.map((artwork) => (
                <div key={artwork.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <img
                    src={artwork.image_url}
                    alt={artwork.title}
                    className="w-full h-48 object-cover"
                  />
                  
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{artwork.title}</h3>
                    
                    <div className="space-y-1 text-sm text-gray-600 mb-3">
                      {artwork.medium && <p>{artwork.medium}</p>}
                      {artwork.year && <p>{artwork.year}</p>}
                    </div>
                    
                    {artwork.for_sale && artwork.price && (
                      <div className="text-green-600 font-semibold">
                        {artwork.currency} {artwork.price}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Inquiry Modal */}
      {inquiryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold">Contact {artist.name}</h3>
              <button
                onClick={() => setInquiryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleInquirySubmit} className="p-6 space-y-4">
              {!user && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    Please <Link to="/login" className="font-medium underline">sign in</Link> or{' '}
                    <Link to="/register" className="font-medium underline">create an account</Link> to send inquiries.
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Email
                </label>
                <input
                  type="email"
                  value={inquiryForm.email}
                  onChange={(e) => setInquiryForm(prev => ({ ...prev, email: e.target.value }))}
                  className="input"
                  required
                  disabled={!user}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={inquiryForm.message}
                  onChange={(e) => setInquiryForm(prev => ({ ...prev, message: e.target.value }))}
                  className="input"
                  rows="4"
                  required
                  disabled={!user}
                  placeholder="Your message to the artist..."
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setInquiryModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!user}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send Inquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ArtistProfile
