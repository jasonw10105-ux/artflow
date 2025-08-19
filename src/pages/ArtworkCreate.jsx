import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const ArtworkCreate = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const batchTokenFromState = location.state?.batchToken
  const activeBatchInSession = sessionStorage.getItem('activeUploadBatch')

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingIds, setSavingIds] = useState({})

  useEffect(() => {
    if (!profile?.id) return
    if (!batchTokenFromState || !activeBatchInSession || batchTokenFromState !== activeBatchInSession) {
      navigate('/dashboard/artworks')
      return
    }
    fetchPendingArtworks()
  }, [profile?.id, batchTokenFromState, activeBatchInSession, navigate])

  useEffect(() => {
    return () => sessionStorage.removeItem('activeUploadBatch')
  }, [])

  const fetchPendingArtworks = async () => {
    try {
      const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .eq('artist_id', profile.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
      if (error) throw error
      setItems(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load artworks')
    } finally {
      setLoading(false)
    }
  }

  const handleFieldChange = (id, field, value) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  const handleSave = async (id) => {
    const item = items.find(i => i.id === id)
    if (!item) return
    setSavingIds(prev => ({ ...prev, [id]: true }))

    try {
      const { error } = await supabase
        .from('artworks')
        .update({
          title: item.title,
          description: item.description,
          medium: item.medium,
          dimensions: item.dimensions,
          year: item.year,
          price: item.price,
          for_sale: item.for_sale,
          status: 'complete'
        })
        .eq('id', id)
      if (error) throw error
      toast.success('Saved')
    } catch (err) {
      console.error(err)
      toast.error('Failed to save')
    } finally {
      setSavingIds(prev => ({ ...prev, [id]: false }))
    }
  }

  const allComplete = useMemo(() => items.every(i => i.status === 'complete'), [items])

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Complete Your Uploads</h1>
      {loading && <p>Loading…</p>}
      {!loading && items.length === 0 && <p>No pending artworks in this batch.</p>}
      {items.map(item => (
        <div key={item.id} className="border p-3 rounded space-y-2">
          <img src={item.image_url} alt="" className="max-h-40 w-auto" />
          <input type="text" value={item.title} onChange={e => handleFieldChange(item.id, 'title', e.target.value)} placeholder="Title" className="input"/>
          <textarea value={item.description || ''} onChange={e => handleFieldChange(item.id, 'description', e.target.value)} placeholder="Description" className="textarea"/>
          <input type="text" value={item.medium || ''} onChange={e => handleFieldChange(item.id, 'medium', e.target.value)} placeholder="Medium" className="input"/>
          <input type="text" value={item.dimensions || ''} onChange={e => handleFieldChange(item.id, 'dimensions', e.target.value)} placeholder="Dimensions" className="input"/>
          <input type="number" value={item.year || ''} onChange={e => handleFieldChange(item.id, 'year', e.target.value)} placeholder="Year" className="input"/>
          <input type="number" value={item.price || ''} onChange={e => handleFieldChange(item.id, 'price', e.target.value)} placeholder="Price" className="input"/>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={item.for_sale} onChange={e => handleFieldChange(item.id, 'for_sale', e.target.checked)} />
            For Sale
          </label>
          <button
            onClick={() => handleSave(item.id)}
            disabled={savingIds[item.id]}
            className="btn-primary"
          >
            {savingIds[item.id] ? 'Saving…' : 'Save'}
          </button>
        </div>
      ))}
      {allComplete && items.length > 0 && <p className="text-green-600 font-semibold">All artworks completed!</p>}
    </div>
  )
}

export default ArtworkCreate
