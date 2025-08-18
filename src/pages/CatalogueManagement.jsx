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
  Share2
} from 'lucide-react'
import jsPDF from 'jspdf'
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
    artwork_ids: [],
    schedule_send_enabled: false,
    scheduled_send: ''
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

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      is_public: true,
      password: '',
      artwork_ids: [],
      schedule_send_enabled: false,
      scheduled_send: ''
    })
  }

  const handleEdit = (catalogue) => {
    setEditingCatalogue(catalogue)
    setFormData({
      title: catalogue.title || '',
      description: catalogue.description || '',
      is_public: catalogue.is_public,
      password: catalogue.password || '',
      artwork_ids: catalogue.catalogue_artworks?.map(ca => ca.artworks.id) || [],
      schedule_send_enabled: !!catalogue.scheduled_send,
      scheduled_send: catalogue.scheduled_send || ''
    })
    setShowModal(true)
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
        artist_id: profile.id,
        scheduled_send: formData.schedule_send_enabled ? formData.scheduled_send : null
      }

      let catalogueId

      if (editingCatalogue) {
        const { error } = await supabase
          .from('catalogues')
          .update(catalogueData)
          .eq('id', editingCatalogue.id)

        if (error) throw error
        catalogueId = editingCatalogue.id

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
    return <div className="p-6">Loading...</div>
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
                  {catalogue.scheduled_send && (
                    <p className="text-xs text-gray-500 mb-2">
                      Scheduled for: {new Date(catalogue.scheduled_send).toLocaleString()}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 mb-2">{catalogue.description}</p>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <button onClick={() => handleEdit(catalogue)} title="Edit">
                    <Edit className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  </button>
                  <button onClick={() => handleDelete(catalogue.id)} title="Delete">
                    <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-600" />
                  </button>
                  <button onClick={() => copyShareLink(catalogue)} title="Copy share link">
                    <Share2 className="h-4 w-4 text-gray-400 hover:text-blue-600" />
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="input w-full"
                  rows="3"
                  placeholder="Describe this catalogue..."
                />
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="schedule_send_enabled"
                  checked={formData.schedule_send_enabled}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label className="text-sm text-gray-700">Schedule send</label>
              </div>

              {formData.schedule_send_enabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Send Date & Time</label>
                  <input
                    type="datetime-local"
                    name="scheduled_send"
                    value={formData.scheduled_send}
                    onChange={handleInputChange}
                    className="input w-full"
                  />
                </div>
              )}

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
                  className="btn-primary flex items-center space-x-2"
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
