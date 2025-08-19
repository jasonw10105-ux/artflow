import React, { useRef, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { X } from 'lucide-react'

const randomToken = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)

const UploadArtworkModal = ({ isOpen, onClose, profile }) => {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [items, setItems] = useState([])
  const [uploading, setUploading] = useState(false)
  const [inserting, setInserting] = useState(false)

  const canClose = !uploading && !inserting
  const allSucceeded = items.length && items.every(i => i.status === 'success')
  const totalSuccess = useMemo(() => items.filter(i => i.status === 'success').length, [items])
  const totalError = useMemo(() => items.filter(i => i.status === 'error').length, [items])

  if (!isOpen) return null
  if (!profile?.id) return <div>You must be signed in to upload.</div>

  const startUpload = async (file) => {
    setItems(prev => [...prev, { name: file.name, status: 'uploading', publicUrl: null }])
    setUploading(true)
    try {
      const key = `${profile.id}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('artworks').upload(key, file)
      if (error) throw error
      const { data } = supabase.storage.from('artworks').getPublicUrl(key)
      const publicUrl = data?.publicUrl
      if (!publicUrl) throw new Error('No URL')
      setItems(prev => prev.map(i => i.name === file.name ? { ...i, status: 'success', publicUrl } : i))
    } catch (err) {
      console.error(err)
      toast.error(`Upload failed: ${file.name}`)
      setItems(prev => prev.map(i => i.name === file.name ? { ...i, status: 'error' } : i))
    } finally {
      setUploading(items.some(i => i.status === 'uploading'))
    }
  }

  const handleFiles = async (e) => {
    const selected = Array.from(e.target.files || [])
    for (const f of selected) await startUpload(f)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleCreate = async () => {
    if (!allSucceeded) return
    setInserting(true)
    const batchToken = randomToken()
    sessionStorage.setItem('activeUploadBatch', batchToken)
    try {
      const rows = items.map(i => ({
        artist_id: profile.id,
        image_url: i.publicUrl,
        status: 'pending',
        title: 'Untitled',
        for_sale: true,
        batch_token: batchToken
      }))
      const { error } = await supabase.from('artworks').insert(rows)
      if (error) throw error
      toast.success('Artworks ready! Add details now.')
      onClose()
      navigate('/dashboard/artworks/create', { state: { batchToken } })
    } catch (err) {
      console.error(err)
      toast.error('Failed to create artworks')
    } finally {
      setInserting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-lg relative">
        <button onClick={() => canClose && onClose()} className="absolute top-2 right-2"><X /></button>
        <h2 className="font-bold mb-4">Upload Artwork</h2>
        <input type="file" multiple ref={inputRef} onChange={handleFiles} disabled={uploading || inserting} />
        {items.map(i => <div key={i.name}>{i.name}: {i.status}</div>)}
        <div className="mt-2 flex justify-end gap-2">
          <button onClick={() => canClose && onClose()} disabled={!canClose}>Cancel</button>
          <button onClick={handleCreate} disabled={!allSucceeded || uploading || inserting}>
            {inserting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UploadArtworkModal
