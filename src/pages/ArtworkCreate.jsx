import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const generateSlug = (text) => text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')

const ArtworkCreate = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: '', description: '', medium: '', year: '', image_url: '', price: '', price_negotiable: false, unique_url: ''
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => {
      const updated = { ...prev, [name]: type === 'checkbox' ? checked : value }
      if (name === 'title' && value.trim() && profile?.id) {
        updated.unique_url = `/artist/${profile.id}/${generateSlug(value)}`
      }
      return updated
    })
  }

  const handleSave = async () => {
    if (!formData.title || !formData.image_url || (!formData.price && !formData.price_negotiable)) {
      toast.error('Title, Image, and Price are required')
      return
    }

    try {
      const { error } = await supabase.from('artworks').insert([{ ...formData, artist_id: profile.id }])
      if (error) throw error
      toast.success('Artwork created!')
      navigate('/dashboard/artworks')
    } catch (err) {
      console.error(err)
      toast.error('Failed to create artwork')
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create Artwork</h1>
      <input placeholder="Title" name="title" value={formData.title} onChange={handleChange} className="input mb-2 w-full" />
      <input placeholder="Medium" name="medium" value={formData.medium} onChange={handleChange} className="input mb-2 w-full" />
      <input placeholder="Year" name="year" value={formData.year} onChange={handleChange} className="input mb-2 w-full" />
      <input placeholder="Image URL" name="image_url" value={formData.image_url} onChange={handleChange} className="input mb-2 w-full" />
      <input placeholder="Price" name="price" value={formData.price} onChange={handleChange} className="input mb-2 w-full" />
      <label className="flex items-center gap-2 mb-4">
        <input type="checkbox" name="price_negotiable" checked={formData.price_negotiable} onChange={handleChange} />
        Negotiable
      </label>
      <button onClick={handleSave} className="btn-primary">Save Artwork</button>
    </div>
  )
}

export default ArtworkCreate
