import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Trash2, Edit, Image as ImageIcon } from 'lucide-react'
import UploadArtworkModal from './UploadArtworkModal' // ensure correct path

const ArtworkList = () => {
  const { profile } = useAuth()
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMedium, setFilterMedium] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false) // modal state

  useEffect(() => {
    if (profile) fetchArtworks()
  }, [profile])

  const fetchArtworks = async () => {
    try {
      const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setArtworks(data || [])
    } catch (err) {
      console.error('Error fetching artworks:', err)
      toast.error('Failed to load artworks')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this artwork?')) return
    try {
      const { error } = await supabase.from('artworks').delete().eq('id', id)
      if (error) throw error
      toast.success('Artwork deleted successfully')
      fetchArtworks()
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete artwork')
    }
  }

  const filteredArtworks = artworks.filter((a) =>
    a.title?.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (filterMedium ? a.medium === filterMedium : true)
  )

  if (loading) return <div className="p-6">Loading artworks...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header + Upload */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Artwork Management</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary"
        >
          Upload Artwork
        </button>
      </div>

      {/* Upload Modal */}
      {isModalOpen && (
        <UploadArtworkModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          profile={profile}
        />
      )}

      {/* Search & Filter */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input"
        />
        <select
          value={filterMedium}
          onChange={(e) => setFilterMedium(e.target.value)}
          className="input"
        >
          <option value="">All Mediums</option>
          <option value="Painting">Painting</option>
          <option value="Sculpture">Sculpture</option>
          <option value="Digital">Digital</option>
        </select>
      </div>

      {/* Artwork Grid */}
      {filteredArtworks.length === 0 ? (
        <div className="text-center py-12">
          <ImageIcon className="h-24 w-24 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No artworks found</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArtworks.map((artwork) => {
            const isPending = artwork.status === 'pending'
            return (
              <div key={artwork.id} className="card overflow-hidden relative border">
                <img
                  src={artwork.image_url}
                  alt={artwork.title || 'Untitled'}
                  className="w-full h-48 object-cover"
                />

                {/* Pending badge */}
                {isPending && (
                  <span className="absolute top-2 left-2 bg-yellow-400 text-black text-xs px-2 py-1 rounded">
                    Pending Details
                  </span>
                )}

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">{artwork.title || 'Untitled'}</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {artwork.medium || 'Unknown Medium'} • {artwork.year || 'N/A'} • ${artwork.price?.toFixed(2)}
                  </p>

                  <div className="flex justify-between items-center mt-2">
                    <div className="flex space-x-2">
                      <a href={`/dashboard/artworks/edit/${artwork.id}`} className="p-2 text-gray-400 hover:text-gray-600">
                        <Edit className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => handleDelete(artwork.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {artwork.unique_url && (
                      <div className="flex space-x-2">
                        <a
                          href={artwork.unique_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 text-sm underline"
                        >
                          Open Link
                        </a>
                        <button
                          onClick={() => navigator.clipboard.writeText(artwork.unique_url) && toast.success('Copied!')}
                          className="text-sm text-gray-500 underline"
                        >
                          Copy Link
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ArtworkList
