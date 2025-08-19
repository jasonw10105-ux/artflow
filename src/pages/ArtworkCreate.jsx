import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { useLocation, useNavigate } from 'react-router-dom'

const ArtworkCreate = () => {
  const { profile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const uploadedIds = location.state?.uploadedIds || []

  const [pendingArtworks, setPendingArtworks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uploadedIds.length) {
      toast.error('No newly uploaded artworks to edit.')
      navigate('/dashboard/artworks')
      return
    }
    if (profile) fetchPendingArtworks()
  }, [profile, uploadedIds])

  const fetchPendingArtworks = async () => {
    try {
      const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .in('id', uploadedIds)
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPendingArtworks(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load your newly uploaded artworks.')
      navigate('/dashboard/artworks')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-6">Loading your artworks...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {pendingArtworks.map((artwork) => (
        <div key={artwork.id} className="border p-4 rounded">
          <img
            src={artwork.image_url}
            alt={artwork.title}
            className="w-full h-64 object-cover mb-4 rounded"
          />
          <input
            type="text"
            defaultValue={artwork.title}
            placeholder="Title"
            className="input w-full mb-2"
          />
          <textarea
            defaultValue={artwork.description}
            placeholder="Description"
            className="input w-full mb-2"
          />
          <input
            type="text"
            defaultValue={artwork.medium}
            placeholder="Medium"
            className="input w-full mb-2"
          />
          <input
            type="number"
            defaultValue={artwork.year}
            placeholder="Year"
            className="input w-full mb-2"
          />
        </div>
      ))}
    </div>
  )
}

export default ArtworkCreate
