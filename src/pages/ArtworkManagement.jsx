import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Edit, Trash2, Upload, Save, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'

const ArtworkManagement = () => {
  const { profile } = useAuth()
  const [mode, setMode] = useState('manage') // 'manage' | 'create'
  const [artworks, setArtworks] = useState([])
  const [pendingArtworks, setPendingArtworks] = useState([])
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
      edition_number: ''
    }
  }

  useEffect(() => {
    if (profile) fetchArtworks()
  }, [profile])

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
          const fileName = `${profile.id}/${Date.now()}-${file.name}`
          const { error } = await supabase.storage.from('artworks').upload(fileName, file)
          if (error) return null
          const { data: { publicUrl } } = supabase.storage.from('artworks').getPublicUrl(fileName)
          return { image_url: publicUrl, temp: true, saved: false }
        })
      )
      const validUploads = uploads.filter(Boolean)
      if (!validUploads.length) {
        toast.error('No images uploaded successfully')
        return
      }
      setPendingArtworks(prev => [...prev, ...validUploads])
      if (!selectedPending) {
        setSelectedPending(validUploads[0])
        setFormData({ ...initialFormData(), image_url: validUploads[0].image_url })
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

  const selectPendingArtwork = (art) => {
    setSelectedPending(art)
    setFormData({ ...initialFormData(), ...art })
  }

  const isArtworkReady = (art) => {
    return art.title && art.year && art.image_url
  }

  const handleSavePending = async () => {
    if (!isArtworkReady(formData)) {
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

      await supabase.from('artworks').insert([artworkData])

      toast.success('Artwork saved successfully')

      // Mark saved
      setPendingArtworks(prev =>
        prev.map(a =>
          a.image_url === selectedPending.image_url ? { ...a, saved: true } : a
        )
      )

      const unsaved = pendingArtworks.filter(a => !a.saved && a.image_url !== selectedPending.image_url)
      if (unsaved.length) {
        selectPendingArtwork(unsaved[0])
      } else {
        setSelectedPending(null)
        setMode('manage')
        fetchArtworks()
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to save artwork')
    }
  }

  const handleDelete = async (artwork) => {
    if (!window.confirm('Are you sure you want to delete this artwork?')) return
    try {
      if (artwork.saved) {
        await supabase.from('artworks').delete().eq('id', artwork.id)
        fetchArtworks()
      } else {
        setPendingArtworks(prev => prev.filter(a => a.image_url !== artwork.image_url))
        if (selectedPending?.image_url === artwork.image_url) setSelectedPending(null)
      }
      toast.success('Artwork removed')
    } catch (err) {
      console.error(err)
      toast.error('Failed to remove artwork')
    }
  }

  if (loading) return <p>Loading...</p>

  return (
    <div className="p-6 max-w-7xl mx-auto flex gap-6">
      {mode === 'manage' && (
        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Artwork Management</h1>
            <button onClick={() => setShowUploadModal(true)} className="btn-primary flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Add Artwork</span>
            </button>
          </div>
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
                    <h3 className="font-semibold mb-1">{artwork.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{artwork.medium} • {artwork.year}</p>
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <button onClick={() => selectPendingArtwork(artwork)} className="p-2 text-gray-400 hover:text-gray-600">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(artwork)} className="p-2 text-gray-400 hover:text-red-600">
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
                  className={`border rounded overflow-hidden cursor-pointer flex justify-between items-center p-1 ${
                    selectedPending?.image_url === art.image_url ? 'ring-2 ring-primary-500' : ''
                  }`}
                  onClick={() => selectPendingArtwork(art)}
                >
                  <img src={art.image_url} className="w-16 h-16 object-cover" />
                  <span className={`ml-2 text-sm font-semibold ${isArtworkReady(art) ? 'text-green-600' : 'text-red-600'}`}>
                    {isArtworkReady(art) ? 'Ready' : 'Incomplete'}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(art) }} className="text-red-500 ml-2">
                    <X className="h-4 w-4"/>
                  </button>
                </div>
              ))}
              {pendingArtworks.length === 0 && <p className="text-gray-500 text-sm">No pending artworks. Upload some!</p>}
            </div>
            <button onClick={() => setShowUploadModal(true)} className="btn-primary mt-4 flex items-center justify-center">
              <Upload className="h-4 w-4 mr-2" /> Add More Works
            </button>
          </div>

          {/* Main Form */}
          <div className="flex-1 pl-6">
            {selectedPending ? (
              <div>
                <h2 className="text-2xl font-semibold mb-4">Artwork Details</h2>
                <div className="space-y-4">
                  <img src={formData.image_url} className="w-full h-64 object-cover rounded" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Title *</label>
                      <input type="text" name="title" value={formData.title} onChange={handleInputChange} className="input w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Medium</label>
                      <input type="text" name="medium" value={formData.medium} onChange={handleInputChange} className="input w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Year *</label>
                      <input type="number" name="year" value={formData.year} onChange={handleInputChange} className="input w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Price</label>
                      <input type="number" name="price" value={formData.price} onChange={handleInputChange} className="input w-full" />
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button onClick={handleSavePending} className="btn-primary flex items-center space-x-2">
                      <Save className="h-4 w-4" />
                      <span>{pendingArtworks.length > 1 && pendingArtworks.some(a => !a.saved) ? 'Save & Next' : 'Save & Finish'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p>Select a pending artwork from the sidebar to fill details.</p>
            )}
          </div>
        </>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Upload Images</h3>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleMultipleUpload(e.target.files)}
            />
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowUploadModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ArtworkManagement
