import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const ArtworkCreate = () => {
  const { profile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [uploadedIds, setUploadedIds] = useState(location.state?.uploadedIds || [])
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uploadedIds.length) {
      toast.error('No new artworks to edit.')
      navigate('/dashboard/artworks', { replace: true })
    } else {
      fetchUploadedArtworks()
    }

    // Clear uploaded IDs on unmount to prevent going back
    return () => setUploadedIds([])
  }, [uploadedIds, navigate])

  const fetchUploadedArtworks = async () => {
    try {
      const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .in('id', uploadedIds)
      if (error) throw error
      setArtworks(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load newly uploaded artworks')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-6">Loading artworks...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Complete Your Artworks</h1>

      {artworks.map((artwork) => (
        <div key={artwork.id} className="card p-4 mb-4 border rounded">
          <img src={artwork.image_url} alt={artwork.title} className="w-full h-64 object-cover mb-4" />
          <input
            type="text"
            defaultValue={artwork.title}
            placeholder="Title"
            className="input mb-2 w-full"
          />
          <textarea
            defaultValue={artwork.description}
            placeholder="Description"
            className="input mb-2 w-full"
          />
          <input
            type="text"
            defaultValue={artwork.medium}
            placeholder="Medium"
            className="input mb-2 w-full"
          />
          <input
            type="number"
            defaultValue={artwork.year}
            placeholder="Year"
            className="input mb-2 w-full"
          />
          <input
            type="number"
            defaultValue={artwork.price}
            placeholder="Price"
            className="input mb-2 w-full"
          />
        </div>
      ))}
    </div>
  )
}
export default ArtworkCreate
