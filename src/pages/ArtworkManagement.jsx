import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Upload, Save, Image as ImageIcon, Trash2, Edit } from 'lucide-react'
import toast from 'react-hot-toast'

const ArtworkManagement = () => {
  const { profile } = useAuth()

  const [mode, setMode] = useState('manage') // 'manage' | 'create' | 'edit'
  const [artworks, setArtworks] = useState([])
  const [pendingArtworks, setPendingArtworks] = useState([])
  const [selectedPending, setSelectedPending] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState(initialFormData())

  function initialFormData() {
    return {
      title: '',
      description: '',
      medium: '',
      width: '',
      height: '',
      depth: '',
      weight: '',
      year: '',
      month: '',
      dateRangeStart: '',
      dateRangeEnd: '',
      price: '',
      price_negotiable: false,
      priceMin: '',
      priceMax: '',
      currency: 'USD',
      edition_size: '',
      edition_number: '',
      provenance: 'From the artist',
      signed: false,
      signed_where: '',
      image_url: '',
      unique_url: ''
    }
  }

  useEffect(() => {
    if (profile) fetchArtworks()
  }, [profile])

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
          const fileExt = file.name.split('.').pop()
          const fileName = `${profile.id}/${Date.now()}-${file.name}`

          const { error } = await supabase.storage.from('artworks').upload(fileName, file)
          if (error) throw error

          const { data: { publicUrl } } = supabase.storage.from('artworks').getPublicUrl(fileName)
          return { image_url: publicUrl, temp: true }
        })
      )

      const validUploads = uploads.filter(Boolean)
      setPendingArtworks(prev => [...prev, ...validUploads])
      if (!selectedPending && validUploads.length > 0) {
        setSelectedPending(validUploads[0])
        setFormData({ ...initialFormData(), image_url: validUploads[0].image_url })
      }
      toast.success('Images uploaded. Complete each artwork to save.')
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
    // Mandatory fields
    if (!formData.title?.trim() || !formData.image_url?.trim() || (!formData.price?.trim() && !formData.price_negotiable)) {
      toast.error('Title, Image, and Price are required')
      return
    }

    if (formData.price_negotiable && (!formData.priceMin || !formData.priceMax)) {
      toast.error('Both minimum and maximum price must be specified for negotiable price')
      return
    }

    try {
      const artworkData = {
        ...formData,
        artist_id: profile.id,
        price: formData.price_negotiable ? null : parseFloat(formData.price),
        priceMin: formData.price_negotiable ? parseFloat(formData.priceMin) : null,
        priceMax: formData.price_negotiable ? parseFloat(formData.priceMax) : null,
        year: formData.year ? parseInt(formData.year) : null,
        edition_size: formData.edition_size ? parseInt(formData.edition_size) : null,
        edition_number: formData.edition_number ? parseInt(formData.edition_number) : null,
        unique_url: `/artwork/${profile.id}-${formData.title.replace(/\s+/g, '-')}`
      }

      const { error } = await supabase.from('artworks').upsert([artworkData])
      if (error) throw error

      toast.success('Artwork saved successfully')

      setPendingArtworks(prev => prev.filter(p => p.image_url !== selectedPending.image_url))
      setSelectedPending(null)
      setFormData(initialFormData())
      fetchArtworks()
      setMode('manage')
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

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto flex gap-6">
      {mode === 'manage' && (
        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Artwork Management</h1>
            <label className="btn-primary flex items-center space-x-2 cursor-pointer">
              <Plus className="h-5 w-5" />
              <span>Upload Artwork</span>
              <input type="file" multiple className="hidden" accept="image/*" onChange={handleMultipleUpload} />
            </label>
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
                <div key={artwork.id} className="card overflow-hidden relative">
                  {artwork.pending && <span className="absolute top-2 left-2 bg-yellow-300 px-2 py-1 text-xs rounded">Pending</span>}
                  <img src={artwork.image_url} alt={artwork.title} className="w-full h-48 object-cover" />
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{artwork.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{artwork.medium} • {artwork.year}</p>
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => { setSelectedPending(artwork); setFormData({ ...initialFormData(), ...artwork }); setMode('edit') }}
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

      {(mode === 'create' || mode === 'edit') && selectedPending && (
        <div className="flex-1">
          <h2 className="text-2xl font-semibold mb-4">Artwork Details</h2>
          <div className="space-y-4">
            <div>
              <img src={formData.image_url} className="w-full h-64 object-cover rounded" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input type="text" name="title" value={formData.title} onChange={handleInputChange} className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medium</label>
                <input type="text" name="medium" value={formData.medium} onChange={handleInputChange} className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                <input type="number" name="price" value={formData.price} onChange={handleInputChange} className="input w-full" disabled={formData.price_negotiable} />
                <label className="flex items-center mt-1">
                  <input type="checkbox" name="price_negotiable" checked={formData.price_negotiable} onChange={handleInputChange} className="mr-2" />
                  Negotiable
                </label>
                {formData.price_negotiable && (
                  <div className="flex gap-2 mt-1">
                    <input type="number" name="priceMin" value={formData.priceMin} onChange={handleInputChange} placeholder="Min" className="input w-1/2" />
                    <input type="number" name="priceMax" value={formData.priceMax} onChange={handleInputChange} placeholder="Max" className="input w-1/2" />
                  </div>
                )}
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
              {/* Other fields like dimensions, edition, provenance, signed */}
            </div>

            <div className="flex justify-end pt-4">
              <button type="button" onClick={handleSavePending} className="btn-primary flex items-center space-x-2">
                <Save className="h-4 w-4" />
                <span>{pendingArtworks.length <= 1 ? 'Save and Finish' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ArtworkManagement
