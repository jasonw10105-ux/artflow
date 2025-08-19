import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const ArtworkCreate = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const uploadedArtworkIds = location.state?.uploadedArtworkIds || []

  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (uploadedArtworkIds.length) fetchUploadedArtworks()
    else setLoading(false)
  }, [uploadedArtworkIds])

  const fetchUploadedArtworks = async () => {
    try {
      const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .in('id', uploadedArtworkIds) // only fetch newly uploaded
        .order('created_at', { ascending: true })

      if (error) throw error
      setArtworks(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load uploaded artworks')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (id, field, value) => {
    setArtworks((prev) =>
      prev.map((art) => (art.id === id ? { ...art, [field]: value } : art))
    )
  }

  const handleSave = async (artwork) => {
    const { id, ...updateData } = artwork
    try {
      const { error } = await supabase
        .from('artworks')
        .update(updateData)
        .eq('id', id)
      if (error) throw error
      toast.success('Artwork updated successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to update artwork')
    }
  }

  const handleDone = () => {
    navigate('/dashboard/artworks')
  }

  if (loading) return <div className="p-6">Loading uploaded artworks...</div>
  if (!uploadedArtworkIds.length) return <div className="p-6">No new uploads found.</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Complete Your Uploaded Artworks</h1>

      {artworks.map((artwork) => (
        <div key={artwork.id} className="border rounded p-4 mb-4">
          <img
            src={artwork.image_url}
            alt={artwork.title || 'Untitled'}
            className="w-full h-64 object-cover mb-4 rounded"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Title"
              value={artwork.title || ''}
              onChange={(e) => handleChange(artwork.id, 'title', e.target.value)}
              className="input"
            />
            <input
              type="text"
              placeholder="Medium"
              value={artwork.medium || ''}
              onChange={(e) => handleChange(artwork.id, 'medium', e.target.value)}
              className="input"
            />
            <input
              type="text"
              placeholder="Dimensions"
              value={artwork.dimensions || ''}
              onChange={(e) => handleChange(artwork.id, 'dimensions', e.target.value)}
              className="input"
            />
            <input
              type="number"
              placeholder="Year"
              value={artwork.year || ''}
              onChange={(e) => handleChange(artwork.id, 'year', e.target.value)}
              className="input"
            />
            <input
              type="number"
              placeholder="Price"
              value={artwork.price || 0}
              onChange={(e) => handleChange(artwork.id, 'price', e.target.value)}
              className="input"
            />
            <input
              type="text"
              placeholder="Currency"
              value={artwork.currency || 'USD'}
              onChange={(e) => handleChange(artwork.id, 'currency', e.target.value)}
              className="input"
            />
            <textarea
              placeholder="Description"
              value={artwork.description || ''}
              onChange={(e) => handleChange(artwork.id, 'description', e.target.value)}
              className="input col-span-1 md:col-span-2"
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => handleSave(artwork)}
              className="btn-primary"
            >
              Save
            </button>
          </div>
        </div>
      ))}

      <div className="flex justify-center mt-6">
        <button onClick={handleDone} className="btn-secondary">
          Done
        </button>
      </div>
    </div>
  )
}

export default ArtworkCreate
