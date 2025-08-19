import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const ArtworkCreate = () => {
  const location = useLocation()
  const uploadedArtworkIds = location.state?.uploadedArtworkIds || []

  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (uploadedArtworkIds.length > 0) fetchPendingArtworks()
    else setLoading(false)
  }, [uploadedArtworkIds])

  const fetchPendingArtworks = async () => {
    try {
      const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .in('id', uploadedArtworkIds)
        .order('created_at', { ascending: false })

      if (error) throw error
      setArtworks(data || [])
    } catch (err) {
      console.error('Error fetching uploaded artworks:', err)
      toast.error('Failed to load uploaded artworks')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-6">Loading uploaded artworks...</div>

  if (artworks.length === 0)
    return (
      <div className="p-6 text-center">
        <p>No new artworks to complete.</p>
      </div>
    )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Complete Artwork Details</h1>
      {artworks.map((artwork) => (
        <div key={artwork.id} className="border p-4 mb-4 rounded">
          <img
            src={artwork.image_url}
            alt={artwork.title || 'Untitled'}
            className="w-full h-64 object-cover mb-4"
          />
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
            defaultValue={artwork.price}
            placeholder="Price"
            className="input mb-2 w-full"
          />
        </div>
      ))}
      <button className="btn-primary mt-4">Save Changes</button>
    </div>
  )
}

export default ArtworkCreate
