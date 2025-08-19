import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const ArtworkCreate = ({ profile }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)

  // Get newly uploaded artwork IDs from navigate state
  const uploadedIds = location.state?.uploadedIds || []

  useEffect(() => {
    if (!uploadedIds.length) {
      // If no newly uploaded artworks, redirect back to list
      navigate('/dashboard/artworks')
      return
    }
    fetchPendingArtworks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedIds])

  const fetchPendingArtworks = async () => {
    try {
      const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .eq('artist_id', profile.id)
        .in('id', uploadedIds) // only fetch the newly uploaded
        .order('created_at', { ascending: true })

      if (error) throw error
      setArtworks(data || [])
    } catch (err) {
      console.error('Error fetching uploaded artworks:', err)
      toast.error('Failed to load uploaded artworks')
      navigate('/dashboard/artworks')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (id, field, value) => {
    setArtworks((prev) =>
      prev.map((art) => (art.id === id ? { ...art, [field]: value } : art))
    )
  }

  const handleSave = async (id) => {
    const artwork = artworks.find((a) => a.id === id)
    if (!artwork.title) return toast.error('Title is required')
    try {
      const { error } = await supabase
        .from('artworks')
        .update({
          title: artwork.title,
          description: artwork.description,
          medium: artwork.medium,
          year: artwork.year,
          price: artwork.price,
          for_sale: artwork.for_sale,
          status: 'complete'
        })
        .eq('id', id)

      if (error) throw error
      toast.success('Artwork saved successfully')
      setArtworks((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      console.error(err)
      toast.error('Failed to save artwork')
    }
  }

  if (loading) return <div className="p-6">Loading uploaded artworks...</div>
  if (!artworks.length) return <div className="p-6">All uploaded artworks completed!</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Complete Uploaded Artworks</h1>
      <div className="space-y-6">
        {artworks.map((art) => (
          <div key={art.id} className="border rounded p-4 space-y-2">
            <img src={art.image_url} alt={art.title} className="w-full h-64 object-cover mb-2 rounded" />

            <input
              type="text"
              placeholder="Title"
              value={art.title}
              onChange={(e) => handleChange(art.id, 'title', e.target.value)}
              className="input w-full"
            />
            <textarea
              placeholder="Description"
              value={art.description || ''}
              onChange={(e) => handleChange(art.id, 'description', e.target.value)}
              className="input w-full"
            />
            <input
              type="text"
              placeholder="Medium"
              value={art.medium || ''}
              onChange={(e) => handleChange(art.id, 'medium', e.target.value)}
              className="input w-full"
            />
            <input
              type="number"
              placeholder="Year"
              value={art.year || ''}
              onChange={(e) => handleChange(art.id, 'year', e.target.value)}
              className="input w-full"
            />
            <input
              type="number"
              placeholder="Price"
              value={art.price || ''}
              onChange={(e) => handleChange(art.id, 'price', e.target.value)}
              className="input w-full"
            />
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={art.for_sale || false}
                onChange={(e) => handleChange(art.id, 'for_sale', e.target.checked)}
              />
              <span>For Sale</span>
            </label>

            <div className="flex justify-end">
              <button onClick={() => handleSave(art.id)} className="btn-primary">
                Save
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ArtworkCreate
