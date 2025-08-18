import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Plus, Upload, Edit, Trash2, Save, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'

const ArtworkManagement = () => {
  const { profile } = useAuth()
  const fileInputRef = useRef(null)

  const [mode, setMode] = useState('manage') // 'manage' | 'create'
  const [artworks, setArtworks] = useState([])
  const [pendingArtworks, setPendingArtworks] = useState([])
  const [selectedPending, setSelectedPending] = useState(null)
  const [formData, setFormData] = useState(initialFormData())
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
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
      for_sale: false,
      image_url: ''
    }
  }

  useEffect(() => {
    if (profile) fetchArtworks()
  }, [profile])

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (pendingArtworks.length > 0) {
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
      console.error('Error fetching artworks:', error)
      toast.error('Failed to load artworks')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleAddArtworkClick = () => {
    setShowUploadModal(true)
  }

  const handleChooseImagesClick = () => {
    fileInputRef.current?.click()
  }

  const handleMultipleUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return

    setUploading(true)
    try {
      const uploads = await Promise.all(
        files.map(async (file) => {
          if (file.size > 5 * 1024 * 1024) {
            toast.error(`${file.name} is too large (>5MB)`)
            return null
          }
          const fileName = `${profile.id}/${Date.now()}-${file.name}`
          const { error } = await supabase.storage.from('artworks').upload(fileName, file)
          if (error) throw error

          const { data: { publicUrl } } = supabase.storage.from('artworks').getPublicUrl(fileName)
          return { image_url: publicUrl, temp: true }
        })
      )

      const validUploads = uploads.filter(Boolean)
      if (!validUploads.length) return

      setPendingArtworks(prev => [...prev, ...validUploads])
      setSelectedPending(validUploads[0])
      setFormData({ ...initialFormData(), image_url: validUploads[0].image_url })
      setMode('create')
      setShowUploadModal(false)
      toast.success('Images uploaded. Select each to add details.')
    } catch (err) {
      console.error(err)
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const selectPendingArtwork = (art) => {
    setSelectedPending(art)
    setFormData({ ...initialFormData(), ...art })
  }

  const handleSavePending = async () => {
    if (!formData.title || !formData.year || !formData.image_url) {
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
        year: parseInt(formData.year)
      }

      const { error } = await supabase.from('artworks').insert([artworkData])
      if (error) throw error

      toast.success('Artwork saved successfully')

      setPendingArtworks(prev => prev.filter(p => p.image_url !== selectedPending.image_url))
      setSelectedPending(null)
      setFormData(initialFormData())
      fetchArtworks()
    } catch (err) {
      console.error(err)
      toast.error('Failed to save artwork')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this artwork?')) return
    try {
      const { error } = await supabase.from('artworks').delete().eq('id', id)
      if (error) throw error
      toast.success('Artwork deleted successfully')
      fetchArtworks()
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete artwork')
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
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
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto flex gap-6">
      {mode === 'manage' && (
        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Artwork Management</h1>
            <button
              onClick={handleAddArtworkClick}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Add Artwork</span>
            </button>
          </div>

          {/* Upload Modal */}
          {showUploadModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-96 space-y-4">
                <h2 className="text-lg font-semibold">Upload Artwork</h2>
                <p className="text-sm text-gray-600">Choose images to add to your portfolio.</p>
                <button
                  onClick={handleChooseImagesClick}
                  className="btn-primary flex items-center justify-center space-x-2 w-full"
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4" />
                  <span>Choose Images</span>
                </button>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="btn-secondary w-full"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleMultipleUpload}
                />
              </div>
            </div>
          )}

          {/* Artworks grid */}
          {artworks.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="h-24 w-24 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No artworks yet</h3>
              <p className="text-gray-500 mb-6">Start building your portfolio by adding your first artwork</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {artworks.map((artwork) => (
                <div key={artwork.id} className="card overflow-hidden">
                  <img src={artwork.image_url} alt={artwork.title} className="w-full h-48 object-cover" />
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{artwork.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{artwork.medium} • {artwork.year}</p>
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => toast('Editing not implemented yet in manage mode')}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(artwork.id)}
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

      {mode === 'create' && (
        <>
          {/* Sidebar */}
          <div className="w-1/4 border-r pr-4 flex flex-col">
            <h2 className="text-lg font-semibold mb-4">Pending Artworks</h2>
            <div className="flex-1 overflow-y-auto space-y-2">
              {pendingArtworks.map((art, idx) => (
                <div
                  key={idx}
                  className={`border rounded overflow-hidden cursor-pointer ${selectedPending?.image_url === art.image_url ? 'ring-2 ring-primary-500' : ''}`}
                  onClick={() => selectPendingArtwork(art)}
                >
                  <img src={art.image_url} className="w-full h-24 object-cover" />
                </div>
              ))}
              {pendingArtworks.length === 0 && (
                <p className="text-gray-500 text-sm">No pending artworks. Upload some!</p>
              )}
            </div>
            <label className="btn-primary mt-4 flex items-center justify-center cursor-pointer">
              <Upload className="h-4 w-4 mr-2" /> Add More Works
              <input type="file" multiple className="hidden" accept="image/*" ref={fileInputRef} onChange={handleMultipleUpload} disabled={uploading} />
            </label>
            <button
              className="btn-secondary mt-2"
              onClick={() => setMode('manage')}
              disabled={pendingArtworks.length > 0}
            >
              Finish
            </button>
          </div>

          {/* Main Form */}
          <div className="flex-1 pl-6">
            {selectedPending ? (
              <div>
                <h2 className="text-2xl font-semibold mb-4">Artwork Details</h2>
                <div className="space-y-4">
                  <div>
                    <img src={formData.image_url} className="w-full h-64 object-cover rounded" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Title, Medium, Dimensions, Year, Price, Currency, Editions */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                      <input type="text" name="title" value={formData.title} onChange={handleInputChange} className="input w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Medium</label>
                      <input type="text" name="medium" value={formData.medium} onChange={handleInputChange} className="input w-full" placeholder="Oil on canvas, Digital, etc." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions</label>
                      <input type="text" name="dimensions" value={formData.dimensions} onChange={handleInputChange} className="input w-full" placeholder="24 x 36 inches" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                      <input type="number" name="year" value={formData.year} onChange={handleInputChange} className="input w-full" min="1900" max={new Date().getFullYear()} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                      <input type="number" name="price" value={formData.price} onChange={handleInputChange} className="input w-full" step="0.01" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                      <select name="currency" value={formData.currency} onChange={handleInputChange} className="input w-full">
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="ZAR">ZAR</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Edition Size</label>
                      <input type="number" name="edition_size" value={formData.edition_size} onChange={handleInputChange} className="input w-full" min="1" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Edition Number</label>
                      <input type="number" name="edition_number" value={formData.edition_number} onChange={handleInputChange} className="input w-full" min="1" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea name="description" value={formData.description} onChange={handleInputChange} className="input w-full" rows="3" placeholder="Describe your artwork..." />
                  </div>

                  <div className="flex items-center">
                    <input type="checkbox" name="for_sale" checked={formData.for_sale} onChange={handleInputChange} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" />
                    <label className="ml-2 block text-sm text-gray-700">Available for sale</label>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button type="button" onClick={handleSavePending} className="btn-primary flex items-center space-x-2">
                      <Save className="h-4 w-4" />
                      <span>Save Artwork</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Select a pending artwork to add details.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default ArtworkManagement
