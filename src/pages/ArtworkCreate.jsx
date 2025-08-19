import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

/**
 * ArtworkCreate
 * - Only accessible immediately after upload via batchToken in route state AND sessionStorage.
 * - Loads only artworks with status 'pending' AND matching batch_token for the current artist.
 * - Requires Title and Price. On save, sets status 'complete'.
 * - When all items are saved (or if user navigates away), batch access is consumed so they cannot re-enter.
 */

const ArtworkCreate = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const batchTokenFromState = location.state?.batchToken
  const activeBatchInSession = sessionStorage.getItem('activeUploadBatch')

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingIds, setSavingIds] = useState({})

  // Guard: must have batch token from upload AND it must match the session one
  useEffect(() => {
    if (!profile?.id) return
    if (!batchTokenFromState || !activeBatchInSession || batchTokenFromState !== activeBatchInSession) {
      navigate('/dashboard/artworks')
      return
    }
    fetchBatch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, batchTokenFromState, activeBatchInSession])

  const fetchBatch = async () => {
    try {
      const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .eq('artist_id', profile.id)
        .eq('status', 'pending')
        .eq('batch_token', batchTokenFromState)
        .order('created_at', { ascending: true })

      if (error) throw error
      setItems(data || [])
    } catch (err) {
      console.error('Error loading batch:', err)
      toast.error('Failed to load your uploaded artworks')
      navigate('/dashboard/artworks')
    } finally {
      setLoading(false)
    }
  }

  // Consume batch if user navigates away from this route
  useEffect(() => {
    return () => {
      // prevent re-entry
      sessionStorage.removeItem('activeUploadBatch')
    }
  }, [])

  const handleChange = (id, field, value) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, [field]: value } : it)))
  }

  const validate = (art) => {
    if (!art.title || !String(art.title).trim()) return 'Title is required'
    // price should be filled
    if (art.price == null || art.price === '' || Number(art.price) <= 0) return 'Price must be greater than 0'
    return null
  }

  const handleSave = async (id) => {
    const art = items.find(a => a.id === id)
    const errMsg = validate(art)
    if (errMsg) {
      toast.error(errMsg)
      return
    }

    setSavingIds(prev => ({ ...prev, [id]: true }))
    try {
      const { error } = await supabase
        .from('artworks')
        .update({
          title: art.title,
          description: art.description,
          medium: art.medium,
          dimensions: art.dimensions,
          year: art.year ? Number(art.year) : null,
          price: art.price != null ? Number(art.price) : null,
          currency: art.currency || 'USD',
          for_sale: true, // all art is for sale
          status: 'complete'
        })
        .eq('id', id)
        .eq('artist_id', profile.id)

      if (error) throw error

      toast.success(`Saved "${art.title}"`)
      setItems(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      console.error('Save failed:', err)
      toast.error('Failed to save artwork')
    } finally {
      setSavingIds(prev => ({ ...prev, [id]: false }))
    }
  }

  const isDone = useMemo(() => !loading && items.length === 0, [loading, items.length])

  useEffect(() => {
    if (isDone) {
      toast.success('All uploaded artworks completed')
      navigate('/dashboard/artworks')
    }
  }, [isDone, navigate])

  if (loading) return <div className="p-6">Loading uploaded artworks…</div>

  if (!items.length) {
    // This path also covers when user hits back/refresh after leaving.
    return <div className="p-6">No artworks to complete.</div>
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Complete Your Uploaded Artworks</h1>
      <p className="text-sm text-gray-600 mb-6">
        You’re editing the artworks you just uploaded. Title and Price are required.
      </p>

      <div className="space-y-8">
        {items.map((art) => (
          <div key={art.id} className="border rounded-lg p-4">
            <img
              src={art.image_url}
              alt={art.title || 'Untitled'}
              className="w-full h-64 object-cover rounded mb-3"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="input"
                placeholder="Title"
                value={art.title || ''}
                onChange={(e) => handleChange(art.id, 'title', e.target.value)}
              />
              <input
                className="input"
                placeholder="Price (e.g. 199.99)"
                type="number"
                step="0.01"
                min="0"
                value={art.price ?? ''}
                onChange={(e) => handleChange(art.id, 'price', e.target.value)}
              />

              <input
                className="input"
                placeholder="Medium (e.g. Oil on canvas)"
                value={art.medium || ''}
                onChange={(e) => handleChange(art.id, 'medium', e.target.value)}
              />
              <input
                className="input"
                placeholder="Year (YYYY)"
                type="number"
                value={art.year ?? ''}
                onChange={(e) => handleChange(art.id, 'year', e.target.value)}
              />

              <input
                className="input md:col-span-2"
                placeholder="Dimensions (e.g. 24 x 36 in)"
                value={art.dimensions || ''}
                onChange={(e) => handleChange(art.id, 'dimensions', e.target.value)}
              />

              <textarea
                className="input md:col-span-2"
                placeholder="Description"
                value={art.description || ''}
                onChange={(e) => handleChange(art.id, 'description', e.target.value)}
              />
            </div>

            <div className="flex justify-end mt-4">
              <button
                className="btn-primary"
                onClick={() => handleSave(art.id)}
                disabled={!!savingIds[art.id]}
              >
                {savingIds[art.id] ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ArtworkCreate
