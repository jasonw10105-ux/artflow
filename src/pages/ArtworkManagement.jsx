import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Upload, Save, Image as ImageIcon, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'

const ArtworkManagement = () => {
  const { profile } = useAuth()

  const [mode, setMode] = useState('manage') // 'manage' | 'create'
  const [artworks, setArtworks] = useState([])
  const [pendingArtworks, setPendingArtworks] = useState([]) // uploaded but not saved
  const [selectedPending, setSelectedPending] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState(initialFormData())
  const [showUploadModal, setShowUploadModal] = useState(false)

  function initialFormData() {
    return {
      title: '',
      description: '',
      medium: '',
      dimensions: '',
      year: new Date().getFullYear(),
      price: '',
      currency: 'USD',
      edition_size: '',
      edition_number: '',
      image_url: ''
    }
  }

  useEffect(() => {
    if (profile) fetchArtworks()
  }, [profile])

  // Warn if unsaved pending artworks
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (pendingArtworks.some(a => !a.saved)) {
        e.preventDefault()
        e.returnValue = 'You have unsaved artworks. Refreshing will lose them.'
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [pendingArtworks])

  const fetchArtworks = async () => {
    try {
      const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setArtworks(data || [])
    } catch (error) {
      console.error(error)
      toast.error('Failed to load artworks')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleUpload = async (files) => {
    if (!files.length) return
    setUploading(true)
    try {
      const uploads = await Promise.all(
        Array.from(files).map(async file => {
          if (file.size > 5 * 1024 * 1024) {
            toast.error(`${file.name} is too large (>5MB)`)
            return null
          }
          const fileExt = file.name.split('.').pop()
          const fileName = `${profile.id}/${Date.now()}-${file.name}`
          const { error } = await supabase.storage.from('artworks').upload(fileName, file)
          if (error) throw error
          const { data: { publicUrl } } = supabase.storage.from('artworks').getPublicUrl(fileName)
          return { image_url: publicUrl, saved: false }
        })
      )
      const validUploads = uploads.filter(Boolean)
      setPendingArtworks(prev => [...prev, ...validUploads])
      if (!selectedPending && validUploads.length > 0) {
        selectPendingArtwork(validUploads[0])
      }
      toast.success('Images uploaded. Complete details to save.')
    } catch (err) {
      console.error(err)
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      setShowUploadModal(false)
    }
  }

  const selectPendingArtwork = (art) => {
    setSelectedPending(art)
    setFormData({ ...initialFormData(), ...art })
  }

  const handleRemovePending = (art) => {
    setPendingArtworks(prev => prev.filter(a => a !== art))
    if (selectedPending?.image_url === art.image_url) {
      setSelectedPending(prev => {
        const next = pendingArtworks.find(a => a !== art)
        if (next) selectPendingArtwork(next)
        else setFormData(initialFormData())
        return next || null
      })
    }
  }

  const handleSavePending = async () => {
    if (!formData.title || !formData.year || !formData.image_url) {
      toast.error('Title, Year, and Image are required')
      return
    }

    const updatedArt = { ...selectedPending, ...formData, saved: true }
    try {
      await supabase.from('artworks').insert([{
        ...updatedArt,
        artist_id: profile.id,
        year: parseInt(formData.year),
        price: formData.price ? parseFloat(formData.price) : null,
        edition_size: formData.edition_size ? parseInt(formData.edition_size) : null,
        edition_number: formData.edition_number ? parseInt(formData.edition_number) : null
      }])
      toast.success('Artwork saved')

      // Update pending array
      setPendingArtworks(prev => prev.map(a => a.image_url === updatedArt.image_url ? updatedArt : a))

      // Move to next pending if exists
      const remaining = pendingArtworks.filter(a => !a.saved)
      if (remaining.length > 0) {
        selectPendingArtwork(remaining[0])
      } else {
        setSelectedPending(null)
        setFormData(initialFormData())
        setMode('manage')
        fetchArtworks()
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to save artwork')
    }
  }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {mode === 'manage' && (
        <div>
          <div className="flex justify-between mb-6">
            <h1 className="text-3xl font-bold">Artwork Management</h1>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" /> <span>Add Artwork</span>
            </button>
          </div>

          {artworks.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="h-24 w-24 text-gray-300 mx-auto mb-4" />
              <p>No artworks yet. Upload to start your portfolio.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {artworks.map((art) => (
                <div key={art.id} className="card">
                  <img src={art.image_url} className="w-full h-48 object-cover" />
                  <div className="p-4 flex justify-between items-center">
                    <span>{art.title}</span>
                    <button onClick={async () => {
                      if (!confirm('Delete this artwork?')) return
                      await supabase.from('artworks').delete().eq('id', art.id)
                      fetchArtworks()
                    }}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === 'create' && (
        <div className="flex gap-6">
          {/* Sidebar */}
          {pendingArtworks.length > 0 && (
            <div className="w-64 bg-gray-50 p-4 border-l border-gray-200 overflow-y-auto">
              <h3 className="font-semibold mb-4">Pending Artworks</h3>
              <ul className="space-y-2">
                {pendingArtworks.map((art, index) => {
                  const completed = art.title && art.year && art.image_url && art.saved
                  return (
                    <li
                      key={index}
                      onClick={() => selectPendingArtwork(art)}
                      className={`cursor-pointer flex items-center justify-between p-2 rounded hover:bg-gray-100 ${
                        selectedPending?.image_url === art.image_url ? 'bg-gray-200' : ''
                      }`}
                    >
                      <span className="truncate">{art.title || `Untitled #${index + 1}`}</span>
                      <span className={completed ? 'text-green-500' : 'text-gray-400'}>
                        {completed ? '✅' : '⚪'}
                      </span>
                      <X className="ml-2 h-4 w-4 text-red-500" onClick={() => handleRemovePending(art)} />
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Artwork Form */}
          <div className="flex-1">
            {selectedPending ? (
              <div className="space-y-4">
                <img src={formData.image_url} className="w-full h-64 object-cover rounded" />
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Title *"
                  className="input w-full"
                />
                <input
                  name="medium"
                  value={formData.medium}
                  onChange={handleInputChange}
                  placeholder="Medium"
                  className="input w-full"
                />
                <input
                  name="dimensions"
                  value={formData.dimensions}
                  onChange={handleInputChange}
                  placeholder="Dimensions"
                  className="input w-full"
                />
                <input
                  name="year"
                  type="number"
                  value={formData.year}
                  onChange={handleInputChange}
                  placeholder="Year *"
                  className="input w-full"
                />
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Description"
                  className="input w-full"
                />
                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSavePending}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>
                      {pendingArtworks.filter(a => !a.saved).length === 0 ? 'Save & Finish' : 'Save'}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Select a pending artwork to complete details.</p>
            )}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-lg font-semibold mb-4">Upload Images</h2>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={e => handleUpload(e.target.files)}
            />
            <button className="btn-secondary mt-4" onClick={() => setShowUploadModal(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ArtworkManagement
