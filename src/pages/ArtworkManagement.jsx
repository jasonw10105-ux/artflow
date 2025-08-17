import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  DollarSign,
  Upload,
  X,
  Save,
  Image as ImageIcon
} from 'lucide-react'
import toast from 'react-hot-toast'

const ArtworkManagement = () => {
  const { profile } = useAuth()
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingArtwork, setEditingArtwork] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
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
  })

  useEffect(() => {
    if (profile) {
      fetchArtworks()
    }
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
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('artworks')
        .upload(fileName, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('artworks')
        .getPublicUrl(fileName)

      setFormData(prev => ({ ...prev, image_url: publicUrl }))
      toast.success('Image uploaded successfully')
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.image_url) {
      toast.error('Please upload an image')
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

      if (editingArtwork) {
        const { error } = await supabase
          .from('artworks')
          .update(artworkData)
          .eq('id', editingArtwork.id)
        
        if (error) throw error
        toast.success('Artwork updated successfully')
      } else {
        const { error } = await supabase
          .from('artworks')
          .insert([artworkData])
        
        if (error) throw error
        toast.success('Artwork added successfully')
      }

      setShowModal(false)
      setEditingArtwork(null)
      setFormData({
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
      })
      fetchArtworks()
    } catch (error) {
      console.error('Error saving artwork:', error)
      toast.error('Failed to save artwork')
    }
  }

  const handleEdit = (artwork) => {
    setEditingArtwork(artwork)
    setFormData({
      title: artwork.title || '',
      description: artwork.description || '',
      medium: artwork.medium || '',
      dimensions: artwork.dimensions || '',
      year: artwork.year || new Date().getFullYear(),
      price: artwork.price || '',
      currency: artwork.currency || 'USD',
      edition_size: artwork.edition_size || '',
      edition_number: artwork.edition_number || '',
      for_sale: artwork.for_sale || false,
      image_url: artwork.image_url || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this artwork?')) return

    try {
      const { error } = await supabase
        .from('artworks')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Artwork deleted successfully')
      fetchArtworks()
    } catch (error) {
      console.error('Error deleting artwork:', error)
      toast.error('Failed to delete artwork')
    }
  }

  const openAddModal = () => {
    setEditingArtwork(null)
    setFormData({
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
    })
    setShowModal(true)
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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Artwork Management</h1>
        <button
          onClick={openAddModal}
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
          <p className="text-gray-500 mb-6">Start building your portfolio by adding your first artwork</p>
          <button
            onClick={openAddModal}
            className="btn-primary"
          >
            Add Your First Artwork
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {artworks.map((artwork) => (
            <div key={artwork.id} className="card overflow-hidden">
              <div className="relative">
                <img
                  src={artwork.image_url}
                  alt={artwork.title}
                  className="w-full h-48 object-cover"
                />
                {artwork.for_sale && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                    For Sale
                  </div>
                )}
              </div>
              
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{artwork.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{artwork.medium} • {artwork.year}</p>
                {artwork.dimensions && (
                  <p className="text-sm text-gray-500 mb-2">{artwork.dimensions}</p>
                )}
                {artwork.price && (
                  <p className="text-sm font-medium text-green-600 mb-3">
                    {artwork.currency} {artwork.price}
                  </p>
                )}
                
                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(artwork)}
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
                  
                  {artwork.edition_size && (
                    <span className="text-xs text-gray-500">
                      {artwork.edition_number || '?'}/{artwork.edition_size}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingArtwork ? 'Edit Artwork' : 'Add New Artwork'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Artwork Image
                </label>
                {formData.image_url ? (
                  <div className="relative">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <label className="cursor-pointer">
                      <span className="text-primary-600 hover:text-primary-500">
                        {uploading ? 'Uploading...' : 'Click to upload'}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                    </label>
                    <p className="text-sm text-gray-500">PNG, JPG up to 5MB</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medium
                  </label>
                  <input
                    type="text"
                    name="medium"
                    value={formData.medium}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="Oil on canvas, Digital, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dimensions
                  </label>
                  <input
                    type="text"
                    name="dimensions"
                    value={formData.dimensions}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="24 x 36 inches"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    className="input"
                    min="1900"
                    max={new Date().getFullYear()}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="input"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className="input"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="ZAR">ZAR</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Edition Size
                  </label>
                  <input
                    type="number"
                    name="edition_size"
                    value={formData.edition_size}
                    onChange={handleInputChange}
                    className="input"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Edition Number
                  </label>
                  <input
                    type="number"
                    name="edition_number"
                    value={formData.edition_number}
                    onChange={handleInputChange}
                    className="input"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="input"
                  rows="3"
                  placeholder="Describe your artwork..."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="for_sale"
                  checked={formData.for_sale}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Available for sale
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !formData.image_url}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{editingArtwork ? 'Update' : 'Add'} Artwork</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ArtworkManagement