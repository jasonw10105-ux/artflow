import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const generateSlug = (text) =>
  text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')

const ArtworkCreate = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [queue, setQueue] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  // Load pending artworks from Supabase
  useEffect(() => {
    if (!profile) return

    const fetchPendingArtworks = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('artworks')
          .select('*')
          .eq('artist_id', profile.id)
          .or('title.is.null,price.is.null') // pending artworks missing required details
          .order('created_at', { ascending: true })

        if (error) throw error
        setQueue(data || [])
      } catch (err) {
        console.error(err)
        toast.error('Failed to load pending artworks')
      } finally {
        setLoading(false)
      }
    }

    fetchPendingArtworks()
  }, [profile])

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

  const handleRemove = async (index) => {
    const artwork = queue[index]
    try {
      const { error } = await supabase.from('artworks').delete().eq('id', artwork.id)
      if (error) throw error
      setQueue((prev) => prev.filter((_, i) => i !== index))
      toast.success('Artwork removed from queue')
      if (currentIndex >= queue.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to remove artwork')
    }
  }

  const handleAddMore = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return

    for (const file of files) {
      const fileName = `${profile.id}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('artworks').upload(fileName, file)
      if (error) {
        toast.error(`Failed to upload ${file.name}`)
        console.error(error)
        continue
      }

      const { publicUrl } = supabase.storage.from('artworks').getPublicUrl(fileName)

      // Insert pending artwork into Supabase
      const { error: insertError, data } = await supabase
        .from('artworks')
        .insert([{ artist_id: profile.id, image_url: publicUrl }])
        .select()

      if (insertError) {
        console.error(insertError)
        toast.error('Failed to create pending artwork')
      } else {
        setQueue((prev) => [...prev, data[0]])
      }
    }
  }

  const handleSave = async (index, isLast = false) => {
    const artwork = queue[index]
    if (!artwork.title || (!artwork.price && !artwork.price_negotiable)) {
      toast.error('Title and Price are required')
      return
    }

    try {
      const { error } = await supabase
        .from('artworks')
        .update({
          title: artwork.title,
          medium: artwork.medium,
          year: artwork.year,
          price: artwork.price,
          price_negotiable: artwork.price_negotiable,
          unique_url: artwork.unique_url
        })
        .eq('id', artwork.id)

      if (error) throw error
      toast.success(`Artwork "${artwork.title}" saved!`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to save artwork')
      return
    }

    // Move to next artwork or finish
    if (!isLast) {
      setCurrentIndex(index + 1)
    } else {
      navigate('/dashboard/artworks')
    }
  }

  if (loading) return <div className="p-6">Loading pending artworks...</div>
  if (queue.length === 0)
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">No pending artworks</h1>
        <input type="file" multiple onChange={handleAddMore} className="input mb-4" />
      </div>
    )

  const artwork = queue[currentIndex]
  const isLast = currentIndex === queue.length - 1

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        {isLast ? 'Last Artwork in Queue' : `Artwork ${currentIndex + 1} of ${queue.length}`}
      </h1>

      <div className="mb-4">
        <img src={artwork.image_url} alt="Preview" className="w-full h-64 object-cover rounded mb-2" />
        <button onClick={() => handleRemove(currentIndex)} className="text-red-500 underline mb-2">
          Remove this artwork
        </button>
        <input type="file" onChange={handleAddMore} className="input" multiple />
      </div>

      <input
        placeholder="Title"
        name="title"
        value={artwork.title || ''}
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
      <label className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          name="price_negotiable"
          checked={artwork.price_negotiable || false}
          onChange={(e) => handleChange(e, currentIndex)}
        />
        Negotiable
      </label>

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
