import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'

const generateSlug = (text) =>
  text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')

const ArtworkCreate = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [queue, setQueue] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  const newIds = location.state?.newIds || []

  useEffect(() => {
    if (!profile || newIds.length === 0) return

    const fetchNewArtworks = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('artworks')
          .select('*')
          .in('id', newIds)
          .order('created_at', { ascending: true })

        if (error) throw error
        setQueue(data || [])
      } catch (err) {
        console.error(err)
        toast.error('Failed to load newly uploaded artworks')
      } finally {
        setLoading(false)
      }
    }

    fetchNewArtworks()
  }, [profile, newIds])

  const handleChange = (e, index) => {
    const { name, value, type, checked } = e.target
    setQueue((prev) => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        [name]: type === 'checkbox' ? checked : value
      }
      if (name === 'title' && value.trim() && profile?.id) {
        updated[index].unique_url = `/artist/${profile.id}/${generateSlug(value)}`
      }
      return updated
    })
  }

  const handleSave = async (index, isLast = false) => {
    const artwork = queue[index]
    if (!artwork.title) {
      toast.error('Title is required')
      return
    }

    try {
      const { error } = await supabase
        .from('artworks')
        .update({
          title: artwork.title || 'Untitled',
          medium: artwork.medium,
          year: artwork.year,
          price: artwork.price || 0,
          for_sale: true,
          status: 'completed',
          unique_url: artwork.unique_url
        })
        .eq('id', artwork.id)

      if (error) throw error
      toast.success(`Artwork "${artwork.title || 'Untitled'}" saved!`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to save artwork')
      return
    }

    if (!isLast) setCurrentIndex(index + 1)
    else navigate('/dashboard/artworks')
  }

  if (loading) return <div className="p-6">Loading newly uploaded artworks...</div>
  if (queue.length === 0) return <div className="p-6">No new artworks to edit.</div>

  const artwork = queue[currentIndex]
  const isLast = currentIndex === queue.length - 1

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        {isLast ? 'Last Artwork in Queue' : `Artwork ${currentIndex + 1} of ${queue.length}`}
      </h1>

      <div className="mb-4">
        <img src={artwork.image_url} alt="Preview" className="w-full h-64 object-cover rounded mb-2" />
      </div>

      <input
        placeholder="Title"
        name="title"
        value={artwork.title || 'Untitled'}
        onChange={(e) => handleChange(e, currentIndex)}
        className="input mb-2 w-full"
      />
      <input
        placeholder="Medium"
        name="medium"
        value={artwork.medium || ''}
        onChange={(e) => handleChange(e, currentIndex)}
        className="input mb-2 w-full"
      />
      <input
        placeholder="Year"
        name="year"
        value={artwork.year || ''}
        onChange={(e) => handleChange(e, currentIndex)}
        className="input mb-2 w-full"
      />
      <input
        placeholder="Price"
        name="price"
        value={artwork.price || ''}
        onChange={(e) => handleChange(e, currentIndex)}
        className="input mb-2 w-full"
      />

      <div className="flex justify-end gap-2">
        {!isLast && (
          <button onClick={() => handleSave(currentIndex)} className="btn-primary">
            Save & Next
          </button>
        )}
        {isLast && (
          <button onClick={() => handleSave(currentIndex, true)} className="btn-primary">
            Save & Finish
          </button>
        )}
      </div>
    </div>
  )
}

export default ArtworkCreate
