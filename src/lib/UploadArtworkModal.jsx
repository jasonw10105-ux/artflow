import React, { useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * UploadArtworkModal
 * - Auto-uploads files to Storage as soon as they’re selected (no DB inserts yet).
 * - Tracks per-file status (queued | uploading | success | error) and publicUrl.
 * - "Create" button only enables when ALL files have uploaded successfully.
 * - On Create: inserts DB rows with title 'Untitled', status 'pending', for_sale true, batch_token.
 * - Navigates to /dashboard/artworks/create with { batchToken } ONLY if inserts succeeded.
 * - Prevents closing during upload/insert to avoid dangling state.
 */

const randomToken = () =>
  Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)

const UploadArtworkModal = ({ isOpen, onClose, profile }) => {
  const navigate = useNavigate()
  const [items, setItems] = useState([]) // [{name, status, publicUrl}]
  const [uploading, setUploading] = useState(false) // true while any upload is in-flight
  const [inserting, setInserting] = useState(false) // true while DB insert happens
  const inputRef = useRef(null)

  const canClose = !uploading && !inserting
  const allSucceeded = items.length > 0 && items.every(i => i.status === 'success')

  const totalSuccessful = useMemo(() => items.filter(i => i.status === 'success').length, [items])
  const totalErrors = useMemo(() => items.filter(i => i.status === 'error').length, [items])

  if (!isOpen) return null
  if (!profile?.id) {
    // Defensive: no profile, no upload.
    return (
      <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
        <div className="bg-white p-6 rounded-lg w-full max-w-lg">
          <p className="text-red-600">You must be signed in to upload.</p>
          <div className="mt-4 text-right">
            <button onClick={onClose} className="btn-secondary">Close</button>
          </div>
        </div>
      </div>
    )
  }

  const startUploadForFile = async (file) => {
    const fileKey = `${profile.id}/${Date.now()}_${file.name}`

    setItems(prev => [...prev, { name: file.name, status: 'uploading', publicUrl: null }])
    setUploading(true)
    try {
      const { error: storageError } = await supabase.storage
        .from('artworks')
        .upload(fileKey, file)

      if (storageError) {
        throw storageError
      }

      const { data } = supabase.storage.from('artworks').getPublicUrl(fileKey)
      const publicUrl = data?.publicUrl
      if (!publicUrl) throw new Error('Failed to get public URL')

      setItems(prev =>
        prev.map(it =>
          it.name === file.name ? { ...it, status: 'success', publicUrl } : it
        )
      )
    } catch (err) {
      console.error('Upload failed:', err)
      toast.error(`Failed to upload ${file.name}`)
      setItems(prev =>
        prev.map(it =>
          it.name === file.name ? { ...it, status: 'error', publicUrl: null } : it
        )
      )
    } finally {
      // if no remaining "uploading" in items, setUploading(false)
      setUploading(prevUploading => {
        const anyUploadingLeft = items.some(i => i.status === 'uploading')
        return anyUploadingLeft ? true : false
      })
      // Slight delay to allow state above to reflect
      setTimeout(() => {
        const anyUploading = (current => current.some(i => i.status === 'uploading'))(items)
        if (!anyUploading) setUploading(false)
      }, 0)
    }
  }

  const handleFileSelect = async (e) => {
    const selected = Array.from(e.target.files || [])
    if (!selected.length) return

    // De-dup by name (simple safeguard)
    const existingNames = new Set(items.map(i => i.name))
    const toUpload = selected.filter(f => !existingNames.has(f.name))

    for (const file of toUpload) {
      await startUploadForFile(file)
    }

    // Clear input so the same files can be re-selected if needed
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleRemove = (name) => {
    if (uploading || inserting) return
    setItems(prev => prev.filter(i => i.name !== name))
  }

  const handleCreate = async () => {
    if (!allSucceeded || uploading || inserting) return

    setInserting(true)
    const batchToken = randomToken()
    // mark active batch in sessionStorage so /create can verify entry is legitimate
    sessionStorage.setItem('activeUploadBatch', batchToken)

    try {
      const rows = items.map(it => ({
        artist_id: profile.id,
        image_url: it.publicUrl,
        status: 'pending',
        title: 'Untitled',
        for_sale: true,        // all art is for sale
        batch_token: batchToken
      }))

      // Validate client-side (defense-in-depth)
      if (rows.some(r => !r.image_url)) {
        throw new Error('One or more items are missing image URLs.')
      }

      const { error: insertError, data: inserted } = await supabase
        .from('artworks')
        .insert(rows)
        .select('id')

      if (insertError) throw insertError

      if (!inserted || inserted.length === 0) {
        throw new Error('Insert returned no rows')
      }

      toast.success('Artworks created. Let’s add details.')
      // Close modal before navigating
      onClose?.()
      // Navigate *only* after successful insert with batchToken
      navigate('/dashboard/artworks/create', { state: { batchToken } })
    } catch (err) {
      console.error('Insert failed:', err)
      toast.error('Failed to create artwork records. Please try again.')
      // keep modal open so user can retry or remove errored items
    } finally {
      setInserting(false)
    }
  }

  const handleSafeClose = () => {
    if (!canClose) {
      toast.error('Please wait for uploads to finish.')
      return
    }
    onClose?.()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-lg relative">
        <button
          onClick={handleSafeClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
          aria-label="Close upload modal"
        >
          <X />
        </button>

        <h2 className="text-xl font-bold mb-4">Upload Artwork</h2>

        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="mb-4"
          disabled={uploading || inserting}
        />

        {items.length > 0 && (
          <div className="max-h-64 overflow-y-auto mb-4 space-y-2">
            {items.map((it) => (
              <div key={it.name} className="flex items-center justify-between">
                <span className="truncate mr-3">{it.name}</span>
                <div className="flex items-center gap-3">
                  {it.status === 'uploading' && (
                    <div className="w-32 h-2 bg-gray-200 rounded">
                      <div className="h-2 rounded bg-blue-500" style={{ width: '100%' }} />
                    </div>
                  )}
                  {it.status === 'success' && (
                    <span className="text-green-600 text-sm">Ready</span>
                  )}
                  {it.status === 'error' && (
                    <span className="text-red-600 text-sm">Error</span>
                  )}
                  <button
                    onClick={() => handleRemove(it.name)}
                    disabled={uploading || inserting || it.status === 'uploading'}
                    className="text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Ready: {totalSuccessful}</span>
          <span>Errors: {totalErrors}</span>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={handleSafeClose} className="btn-secondary" disabled={!canClose}>
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!allSucceeded || uploading || inserting}
            className="btn-primary"
          >
            {inserting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UploadArtworkModal
