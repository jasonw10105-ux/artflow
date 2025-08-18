import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Download,
  X,
  Save,
  FolderOpen,
  Lock,
  Globe,
  Share2,
  Copy
} from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import toast from 'react-hot-toast'

const CatalogueManagement = () => {
  const { profile } = useAuth()
  const [catalogues, setCatalogues] = useState([])
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCatalogue, setEditingCatalogue] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_public: true,
    password: '',
    artwork_ids: []
  })
  const [generatingPDF, setGeneratingPDF] = useState(false)

  useEffect(() => {
    if (profile) {
      fetchCatalogues()
      fetchArtworks()
    }
  }, [profile])

  const fetchCatalogues = async () => {
    try {
      const { data, error } = await supabase
        .from('catalogues')
        .select(`
          *,
          catalogue_artworks(
            artworks(*)
          )
        `)
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCatalogues(data || [])
    } catch (error) {
      console.error('Error fetching catalogues:', error)
      toast.error('Failed to load catalogues')
    } finally {
      setLoading(false)
    }
  }

  const fetchArtworks = async () => {
    try {
      const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .eq('artist_id', profile.id)
        .order('title')

      if (error) throw error
      setArtworks(data || [])
    } catch (error) {
      console.error('Error fetching artworks:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleArtworkSelection = (artworkId) => {
    setFormData(prev => ({
      ...prev,
      artwork_ids: prev.artwork_ids.includes(artworkId)
        ? prev.artwork_ids.filter(id => id !== artworkId)
        : [...prev.artwork_ids, artworkId]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.artwork_ids.length === 0) {
      toast.error('Please select at least one artwork')
      return
    }

    try {
      const catalogueData = {
        title: formData.title,
        description: formData.description,
        is_public: formData.is_public,
        password: formData.is_public ? null : formData.password,
        artist_id: profile.id
      }

      let catalogueId

      if (editingCatalogue) {
        const { error } = await supabase
          .from('catalogues')
          .update(catalogueData)
          .eq('id', editingCatalogue.id)
        
        if (error) throw error
        catalogueId = editingCatalogue.id

        // Delete existing artwork associations
        await supabase
          .from('catalogue_artworks')
          .delete()
          .eq('catalogue_id', catalogueId)
      } else {
        const { data, error } = await supabase
          .from('catalogues')
          .insert([catalogueData])
          .select()
          .single()
        
        if (error) throw error
        catalogueId = data.id
      }

      // Add artwork associations
      const artworkAssociations = formData.artwork_ids.map(artworkId => ({
        catalogue_id: catalogueId,
        artwork_id: artworkId
      }))

      const { error: associationError } = await supabase
        .from('catalogue_artworks')
        .insert(artworkAssociations)

      if (associationError) throw associationError

      toast.success(editingCatalogue ? 'Catalogue updated successfully' : 'Catalogue created successfully')
      setShowModal(false)
      setEditingCatalogue(null)
      resetForm()
      fetchCatalogues()
    } catch (error) {
      console.error('Error saving catalogue:', error)
      toast.error('Failed to save catalogue')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      is_public: true,
      password: '',
      artwork_ids: []
    })
  }

  const handleEdit = (catalogue) => {
    setEditingCatalogue(catalogue)
    setFormData({
      title: catalogue.title || '',
      description: catalogue.description || '',
      is_public: catalogue.is_public,
      password: catalogue.password || '',
      artwork_ids: catalogue.catalogue_artworks?.map(ca => ca.artworks.id) || []
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this catalogue?')) return

    try {
      const { error } = await supabase
        .from('catalogues')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Catalogue deleted successfully')
      fetchCatalogues()
    } catch (error) {
      console.error('Error deleting catalogue:', error)
      toast.error('Failed to delete catalogue')
    }
  }

  const generatePDF = async (catalogue) => {
    setGeneratingPDF(true)
    try {
      const pdf = new jsPDF()
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      
      // Title page
      pdf.setFontSize(24)
      pdf.text(catalogue.title, pageWidth / 2, 40, { align: 'center' })
      
      pdf.setFontSize(14)
      pdf.text(`By ${profile.name}`, pageWidth / 2, 60, { align: 'center' })
      
      if (catalogue.description) {
        pdf.setFontSize(12)
        const descriptionLines = pdf.splitTextToSize(catalogue.description, pageWidth - 40)
        pdf.text(descriptionLines, 20, 100)
      }

      // Add artworks
      const artworksInCatalogue = catalogue.catalogue_artworks?.map(ca => ca.artworks) || []
      
      for (let i = 0; i < artworksInCatalogue.length; i++) {
        const artwork = artworksInCatalogue[i]
        
        if (i > 0) {
          pdf.addPage()
        } else {
          pdf.addPage()
        }
        
        try {
          // Create a temporary canvas with the artwork image
          const img = new Image()
          img.crossOrigin = 'anonymous'
          
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            img.src = artwork.image_url
          })
          
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          // Calculate dimensions to fit in PDF
          const maxWidth = pageWidth - 40
          const maxHeight = pageHeight - 120
          
          let { width, height } = img
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width *= ratio
          height *= ratio
          
          canvas.width = width
          canvas.height = height
          ctx.drawImage(img, 0, 0, width, height)
          
          const imgData = canvas.toDataURL('image/jpeg', 0.8)
          pdf.addImage(imgData, 'JPEG', (pageWidth - width) / 2, 20, width, height)
          
          // Add artwork details
          const detailsY = 20 + height + 20
          pdf.setFontSize(16)
          pdf.text(artwork.title, 20, detailsY)
          
          pdf.setFontSize(12)
          let currentY = detailsY + 15
          
          if (artwork.medium) {
            pdf.text(`Medium: ${artwork.medium}`, 20, currentY)
            currentY += 15
          }
          
          if (artwork.dimensions) {
            pdf.text(`Dimensions: ${artwork.dimensions}`, 20, currentY)
            currentY += 15
          }
          
          if (artwork.year) {
            pdf.text(`Year: ${artwork.year}`, 20, currentY)
            currentY += 15
          }
          
          if (artwork.description) {
            const descLines = pdf.splitTextToSize(artwork.description, pageWidth - 40)
            pdf.text(descLines, 20, currentY)
          }
          
        } catch (imgError) {
          console.error('Error loading image for PDF:', imgError)
          // Add placeholder text if image fails to load
          pdf.setFontSize(16)
          pdf.text(artwork.title, 20, 40)
          pdf.setFontSize(12)
          pdf.text('Image could not be loaded', 20, 60)
        }
      }
      
      pdf.save(`${catalogue.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`)
      toast.success('PDF generated successfully')
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF')
    } finally {
      setGeneratingPDF(false)
    }
  }

  const copyShareLink = (catalogue) => {
    const baseUrl = window.location.origin
    const shareUrl = catalogue.is_public 
      ? `${baseUrl}/catalogue/${catalogue.id}`
      : `${baseUrl}/private-catalogue/${catalogue.id}`
    
    navigator.clipboard.writeText(shareUrl)
    toast.success('Share link copied to clipboard')
  }

  const openAddModal = () => {
    setEditingCatalogue(null)
    resetForm()
    setShowModal(true)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card p-6">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
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
        <h1 className="text-3xl font-bold text-gray-900">Catalogue Management</h1>
        <button
          onClick={openAddModal}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Create Catalogue</span>
        </button>
      </div>

      {catalogues.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-24 w-24 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No catalogues yet</h3>
          <p className="text-gray-500 mb-6">Create your first catalogue to showcase collections of your work</p>
          <button
            onClick={openAddModal}
            className="btn-primary"
          >
            Create Your First Catalogue
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {catalogues.map((catalogue) => (
            <div key={catalogue.id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{catalogue.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{catalogue.description}</p>
                  <div className="flex items-center space-x-2 mb-3">
                    {catalogue.is_public ? (
                      <div className="flex items-center text-green-600">
                        <Globe className="h-4 w-4 mr-1" />
                        <span className="text-xs">Public</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-orange-600">
                        <Lock className="h-4 w-4 mr-1" />
                        <span className="text-xs">Private</span>
                      </div>
                    )}
                    <span className="text-xs text-gray-500">
                      {catalogue.catalogue_artworks?.length || 0} artworks
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {catalogue.catalogue_artworks?.slice(0, 3).map((ca, index) => (
                  <img
                    key={index}
                    src={ca.artworks.image_url}
                    alt={ca.artworks.title}
                    className="w-full h-16 object-cover rounded"
                  />
                ))}
                {catalogue.catalogue_artworks?.length > 3 && (
                  <div className="w-full h-16 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                    +{catalogue.catalogue_artworks.length - 3} more
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(catalogue)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(catalogue.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => copyShareLink(catalogue)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Copy share link"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex space-x-2">
                  <a
                    href={catalogue.is_public 
                      ? `/catalogue/${catalogue.id}` 
                      : `/private-catalogue/${catalogue.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="View catalogue"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => generatePDF(catalogue)}
                    disabled={generatingPDF}
                    className="p-2 text-gray-400 hover:text-green-600 transition-colors disabled:opacity-50"
                    title="Download PDF"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingCatalogue ? 'Edit Catalogue' : 'Create New Catalogue'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                    Visibility
                  </label>
                  <select
                    name="is_public"
                    value={formData.is_public}
                    onChange={handleInputChange}
                    className="input"
                  >
                    <option value={true}>Public</option>
                    <option value={false}>Private (Password Protected)</option>
                  </select>
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
                  placeholder="Describe this catalogue..."
                />
              </div>

              {!formData.is_public && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="input"
                    required={!formData.is_public}
                    placeholder="Enter password for private access"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Artworks *
                </label>
                {artworks.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No artworks available. Please add some artworks first.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                    {artworks.map((artwork) => (
                      <div
                        key={artwork.id}
                        className={`cursor-pointer border-2 rounded-lg p-2 transition-colors ${
                          formData.artwork_ids.includes(artwork.id)
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleArtworkSelection(artwork.id)}
                      >
                        <img
                          src={artwork.image_url}
                          alt={artwork.title}
                          className="w-full h-24 object-cover rounded mb-2"
                        />
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {artwork.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {artwork.medium}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formData.artwork_ids.length === 0}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{editingCatalogue ? 'Update' : 'Create'} Catalogue</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CatalogueManagement