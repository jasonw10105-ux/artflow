import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Plus,
  Edit,
  Trash2,
  Upload,
  Save,
  Image as ImageIcon,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'

const ArtworkManagement = () => {
  const { profile } = useAuth()

  const [mode, setMode] = useState('manage') // 'manage' | 'create'
  const [artworks, setArtworks] = useState([])
  const [pendingArtworks, setPendingArtworks] = useState([]) // uploaded but not saved
  const [selectedPending, setSelectedPending] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [formData, setFormData] = useState(initialFormData())

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
      edition_number: ''
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
        e.returnValue = 'You have unsaved artworks. Leaving will lose them.'
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
    } catch (err) {
      console.error(err)
      toast.error('Failed to load artworks')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleMultipleUpload = async (files) => {
    if (!files.length) return
    setUploading(true)
    try {
      const uploads = await Promise.all(
        Array.from(files).map(async (file) => {
          if (file.size > 5 * 1024 * 1024) {
            toast.error(`${file.name} is too large (>5MB)`)
            return null
          }
          const fileExt = file.name.split('.').pop()
          const fileName = `${profile.id}/${Date.now()}-${file.name}`
          const { error } = await supabase.storage.from('artworks').upload(fileName, file)
          if (error) throw error
          const { data: { publicUrl } } = supabase.storage.from('artworks').getPublicUrl(fileName)
          return { image_url: publicUrl, temp: true, saved: false }
        })
      )
      const validUploads = uploads.filter(Boolean)
      setPendingArtworks(prev => [...prev, ...validUploads])
      if (!selectedPending && validUploads.length > 0) {
        setSelectedPending(validUploads[0])
        setFormData(initialFormData())
      }
      toast.success('Images uploaded. Complete each artwork to save.')
    } catch (err) {
      console.error(err)
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      setShowUploadModal(false)
    }
  }

  const removePendingArtwork = (art) => {
    setPendingArtworks(prev => prev.filter(a => a !== art))
    if (selectedPending === art) setSelectedPending(null)
  }

  const selectPendingArtwork = (art) => {
    setSelectedPending(art)
    setFormData(initialFormData())
  }

  const isArtworkReady = (art) => {
    return art.title && art.year && art.image_url
  }

  const handleSavePending = async () => {
    if (!formData.title || !formData.year || !selectedPending.image_url) {
      toast.error('Title, Year, and Image are required')
      return
    }

    try {
      const artworkData = {
        ...formData,
        artist_id: profile.id,
        price: formData.price ? parseFloat(formData.price) : null,
        edition_size: formData.edition_size ? parseInt(formData.edition_size) : null,
        edition_number: formData.edition_number ? parseInt(formData.edition_number) : null,
        year: parseInt(formData.year),
        image_url: selectedPending.image_url
      }
      const { error } = await supabase.from('artworks').insert([artworkData])
      if (error) throw error

      toast.success('Artwork saved')

      // mark saved
      setPendingArtworks(prev =>
        prev.map(a => a === selectedPending ? { ...a, saved: true, ...formData } : a)
      )

      // Determine next
      const unsaved = pendingArtworks.filter(a => !a.saved && a !== selectedPending)
      if (unsaved.length > 0) {
        setSelectedPending(unsaved[0])
        setFormData(initialFormData())
      } else {
        setSelectedPending(null)
        setFormData(initialFormData())
        setMode('manage')
      }

      fetchArtworks()
    } catch (err) {
      console.error(err)
      toast.error('Failed to save artwork')
    }
  }

  const handleDeleteArtwork = async (artwork) => {
    if (!confirm('Are you sure you want to delete this artwork?')) return
    try {
      const { error } = await supabase.from('artworks').delete().eq('id', artwork.id)
      if (error) throw error
      toast.success('Artwork deleted')
      fetchArtworks()
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete artwork')
    }
  }

  if (loading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-4">
              <div className="h-48 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto flex gap-6">
      {/* Artwork Grid */}
      {mode === 'manage' && (
        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Artwork Management</h1>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Add Artwork</span>
            </button>
          </div>

          {artworks.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="h-24 w-24 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No artworks yet</h3>
              <p className="text-gray-500 mb-6">Upload your first artwork to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {artworks.map((art) => (
                <div key={art.id} className="card overflow-hidden">
                  <img src={art.image_url} alt={art.title} className="w-full h-48 object-cover" />
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{art.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{art.medium} • {art.year}</p>
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setMode('create')
                            setPendingArtworks([{ ...art, saved: true }])
                            setSelectedPending({ ...art })
                            setFormData({ ...art })
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteArtwork(art)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Form */}
      {mode === 'create' && selectedPending && (
        <>
          {/* Sidebar */}
          <div className="w-1/4 border-r pr-4 flex flex-col">
            <h2 className="text-lg font-semibold mb-4">Pending Artworks</h2>
            <div className="flex-1 overflow-y-auto space-y-2">
              {pendingArtworks.map((art, idx) => (
                <div
                  key={idx}
                  className={`border rounded overflow-hidden cursor-pointer flex items-center justify-between
                    ${selectedPending?.image_url === art.image_url ? 'ring-2 ring-primary-500' : ''}`}
                  onClick={() => selectPendingArtwork(art)}
                >
                  <img src={art.image_url} className="w-16 h-16 object-cover" />
                  <span className={`ml-2 text-xs font-semibold ${
                    isArtworkReady(art) ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {isArtworkReady(art) ? 'Ready' : 'Incomplete'}
                  </span>
                  {!art.saved && (
                    <X className="h-4 w-4 text-gray-400 cursor-pointer" onClick={() => removePendingArtwork(art)} />
                  )}
                </div>
              ))}
              {pendingArtworks.length === 0 && (
                <p className="text-gray-500 text-sm">No pending artworks. Upload some!</p>
              )}
            </div>
            <label className="btn-primary mt-4 flex items-center justify-center cursor-pointer">
              <Upload className="h-4 w-4 mr-2" /> Add More
              <input
                type="file"
                multiple
                className="hidden"
                accept="image/*"
                onChange={e => handleMultipleUpload(e.target.files)}
                disabled={uploading}
              />
            </label>
          </div>

          {/* Main Form */}
          <div className="flex-1 pl-6">
            <h2 className="text-2xl font-semibold mb-4">Artwork Details</h2>
            <div className="space-y-4">
              <div>
                <img src={selectedPending.image_url} className="w-full h-64 object-cover rounded" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Medium</label>
                  <input
                    type="text"
                    name="medium"
                    value={formData.medium}
                    onChange={handleInputChange}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Dimensions</label>
                  <input
                    type="text"
                    name="dimensions"
                    value={formData.dimensions}
                    onChange={handleInputChange}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Year *</label>
                  <input
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Price</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Edition Size</label>
                  <input
                    type="number"
                    name="edition_size"
                    value={formData.edition_size}
                    onChange={handleInputChange}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Edition Number</label>
                  <input
                    type="number"
                    name="edition_number"
                    value={formData.edition_number}
                    onChange={handleInputChange}
                    className="input w-full"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="input w-full"
                    rows={4}
                  />
                </div>
              </div>

              {/* Save / Next / Save & Finish */}
              <div className="mt-4 flex justify-end space-x-4">
                <button
                  onClick={handleSavePending}
                  className="btn-primary flex items-center space-x-2"
                  disabled={uploading}
                >
                  <Save className="h-4 w-4" />
                  <span>
                    {pendingArtworks.filter(a => !a.saved).length === 1 && isArtworkReady(selectedPending)
                      ? 'Save & Finish'
                      : 'Save'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Upload Images</h3>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={e => handleMultipleUpload(e.target.files)}
              disabled={uploading}
              className="mb-4"
            />
            <button
              onClick={() => setShowUploadModal(false)}
              className="btn-secondary w-full"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ArtworkManagement
