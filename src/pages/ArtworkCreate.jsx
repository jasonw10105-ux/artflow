import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const ArtworkCreate = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const batchToken = location.state?.batchToken
  const activeBatch = sessionStorage.getItem('activeUploadBatch')

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingIds, setSavingIds] = useState({})

  useEffect(() => {
    if (!profile?.id) return
    if (!batchToken || !activeBatch || batchToken !== activeBatch) {
      navigate('/dashboard/artworks')
      return
    }
    fetchBatch()
  }, [profile?.id, batchToken, activeBatch, navigate])

  const fetchBatch = async () => {
    try {
      const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .eq('artist_id', profile.id)
        .eq('status', 'pending')
        .eq('batch_token', batchToken)
        .order('created_at', { ascending: true })
      if (error) throw error
      setItems(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load batch')
      navigate('/dashboard/artworks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => () => sessionStorage.removeItem('activeUploadBatch'), [])

  const handleChange = (id, field, value) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, [field]: value } : it)))
  }

  const validate = (art) => {
    if (!art.title?.trim()) return 'Title is required'
    if (!art.price || Number(art.price) <= 0) return 'Price must be > 0'
    return null
  }

  const handleSave = async (id) => {
    const art = items.find(a => a.id === id)
    const err = validate(art)
    if (err) return toast.error(err)
    setSavingIds(prev => ({ ...prev, [id]: true }))
    try {
      const { error } = await supabase.from('artworks').update({
        title: art.title,
        description: art.description,
        medium: art.medium,
        dimensions: art.dimensions,
        year: art.year ? Number(art.year) : null,
        price: Number(art.price),
        currency: art.currency || 'USD',
        for_sale: true,
        status: 'complete'
      }).eq('id', id).eq('artist_id', profile.id)
      if (error) throw error
      toast.success(`Saved "${art.title}"`)
      setItems(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      console.error(err)
      toast.error('Save failed')
    } finally {
      setSavingIds(prev => ({ ...prev, [id]: false }))
    }
  }

  const done = useMemo(() => !loading && items.length === 0, [loading, items.length])

  useEffect(() => {
    if (done) navigate('/dashboard/artworks')
  }, [done, navigate])

  if (loading) return <div className="p-6">Loading…</div>
  if (!items.length) return <div className="p-6">No artworks to complete.</div>

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Complete Uploaded Artworks</h1>
      {items.map(art => (
        <div key={art.id} className="border p-4 rounded mb-4">
          <img src={art.image_url} alt={art.title} className="w-full h-64 object-cover mb-2 rounded"/>
          <input value={art.title || ''} onChange={e => handleChange(art.id, 'title', e.target.value)} placeholder="Title" className="input w-full mb-2"/>
          <input type="number" value={art.price ?? ''} onChange={e => handleChange(art.id, 'price', e.target.value)} placeholder="Price" className="input w-full mb-2"/>
          <textarea value={art.description || ''} onChange={e => handleChange(art.id, 'description', e.target.value)} placeholder="Description" className="input w-full mb-2"/>
          <button onClick={() => handleSave(art.id)} disabled={!!savingIds[art.id]} className="btn-primary">
            {savingIds[art.id] ? 'Saving…' : 'Save'}
          </button>
        </div>
      ))}
    </div>
  )
}

export default ArtworkCreate
