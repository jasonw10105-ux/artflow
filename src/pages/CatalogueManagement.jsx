// src/pages/CatalogueManagement.jsx
import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Save, 
  FolderOpen, 
  Share2 
} from 'lucide-react'
import toast from 'react-hot-toast'

const CatalogueManagement = () => {
  const { profile } = useAuth()
  const [catalogues, setCatalogues] = useState([])
  const [artworks, setArtworks] = useState([])
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCatalogue, setEditingCatalogue] = useState(null)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_public: true,
    password: '',
    artwork_ids: [],
    schedule_send_enabled: false,
    scheduled_send: '',
    contact_ids: []
  })

  useEffect(() => {
    if (profile) {
      fetchCatalogues()
      fetchArtworks()
      fetchContacts()
    }
  }, [profile])

  const fetchCatalogues = async () => {
    try {
      const { data, error } = await supabase
        .from('catalogues')
        .select(`*, catalogue_artworks(artworks(*))`)
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

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setContacts(data || [])
    } catch (error) {
      console.error('Error fetching contacts:', error)
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

  const handleContactSelection = (contactId) => {
    setFormData(prev => ({
      ...prev,
      contact_ids: prev.contact_ids.includes(contactId)
        ? prev.contact_ids.filter(id => id !== contactId)
        : [...prev.contact_ids, contactId]
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
      scheduled_send: '',
      contact_ids: []
    })
    setStep(1)
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
      scheduled_send: catalogue.scheduled_send || '',
      contact_ids: catalogue.contact_ids || []
    })
    setStep(1)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // STEP 1: Catalogue Info
      if (step === 1) {
        const catalogueData = {
          title: formData.title,
          description: formData.description,
          is_public: formData.is_public,
          password: formData.is_public ? null : formData.password,
          artist_id: profile.id
        }

        if (editingCatalogue) {
          await supabase.from('catalogues').update(catalogueData).eq('id', editingCatalogue.id)
          setStep(2)
          return
        } else {
          const { data } = await supabase.from('catalogues').insert([catalogueData]).select().single()
          setEditingCatalogue(data)
          setStep(2)
          return
        }
      }

      // STEP 2: Artworks
      if (step === 2) {
        if (formData.artwork_ids.length === 0) {
          toast.error('Please select at least one artwork')
          return
        }
        const catalogueId = editingCatalogue.id
        await supabase.from('catalogue_artworks').delete().eq('catalogue_id', catalogueId)
        const artworkAssociations = formData.artwork_ids.map(id => ({ catalogue_id: catalogueId, artwork_id: id }))
        await supabase.from('catalogue_artworks').insert(artworkAssociations)
        setStep(3)
        return
      }

      // STEP 3: Schedule & Contacts
      if (step === 3) {
        const catalogueId = editingCatalogue.id
        await supabase.from('catalogues').update({
          scheduled_send: formData.schedule_send_enabled ? formData.scheduled_send : null,
          contact_ids: formData.contact_ids
        }).eq('id', catalogueId)

        toast.success(editingCatalogue ? 'Catalogue updated successfully' : 'Catalogue created successfully')
        setShowModal(false)
        setEditingCatalogue(null)
        resetForm()
        fetchCatalogues()
      }
    } catch (error) {
      console.error('Error saving catalogue:', error)
      toast.error('Failed to save catalogue')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this catalogue?')) return
    try {
      await supabase.from('catalogues').delete().eq('id', id)
      toast.success('Catalogue deleted successfully')
      fetchCatalogues()
    } catch (error) {
      console.error(error)
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

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Catalogue Management</h1>
        <button onClick={openAddModal} className="btn-primary flex items-center space-x-2">
          <Plus className="h-5 w-5" />
          <span>Create Catalogue</span>
        </button>
      </div>

      {catalogues.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FolderOpen className="h-24 w-24 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No catalogues yet</h3>
          <p className="mb-6">Create your first catalogue to showcase collections of your work</p>
          <button onClick={openAddModal} className="btn-primary">Create Your First Catalogue</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {catalogues.map(c => (
            <div key={c.id} className="card p-6">
              <div className="flex justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{c.title}</h3>
                  {c.scheduled_send && <p className="text-xs text-gray-500 mb-1">Scheduled: {new Date(c.scheduled_send).toLocaleString()}</p>}
                  <p className="text-sm text-gray-600">{c.description}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => handleEdit(c)} title="Edit"><Edit className="h-4 w-4 text-gray-400 hover:text-gray-600" /></button>
                <button onClick={() => handleDelete(c.id)} title="Delete"><Trash2 className="h-4 w-4 text-gray-400 hover:text-red-600" /></button>
                <button onClick={() => copyShareLink(c)} title="Copy link"><Share2 className="h-4 w-4 text-gray-400 hover:text-blue-600" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">{editingCatalogue ? 'Edit Catalogue' : 'Create New Catalogue'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Step 1 */}
              {step === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input type="text" name="title" value={formData.title} onChange={handleInputChange} className="input w-full" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea name="description" value={formData.description} onChange={handleInputChange} className="input w-full" rows={3} />
                  </div>
                </>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <div>
                  <p className="font-medium mb-2">Select Artworks *</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {artworks.map(a => (
                      <div key={a.id} className={`border rounded p-2 cursor-pointer ${formData.artwork_ids.includes(a.id) ? 'border-primary-600' : 'border-gray-300'}`} onClick={() => handleArtworkSelection(a.id)}>
                        <img src={a.thumbnail_url} alt={a.title} className="w-full h-32 object-cover mb-2 rounded" />
                        <p className="text-sm text-gray-700">{a.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {step === 3 && (
                <div>
                  <label className="flex items-center space-x-2 mb-2">
                    <input type="checkbox" name="schedule_send_enabled" checked={formData.schedule_send_enabled} onChange={handleInputChange} className="h-4 w-4 text-primary-600" />
                    <span>Schedule Send</span>
                  </label>
                  {formData.schedule_send_enabled && (
                    <input type="datetime-local" name="scheduled_send" value={formData.scheduled_send} onChange={handleInputChange} className="input w-full mb-4" />
                  )}

                  <p className="mb-2 font-medium">Select Contacts</p>
                  <div className="flex flex-wrap gap-2">
                    {contacts.map(c => (
                      <span key={c.id} className={`px-3 py-1 rounded-full border cursor-pointer ${formData.contact_ids.includes(c.id) ? 'bg-primary-600 text-white' : 'border-gray-300 text-gray-700'}`} onClick={() => handleContactSelection(c.id)}>
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between mt-6">
                {step > 1 && <button type="button" onClick={() => setStep(step - 1)} className="btn-secondary">Back</button>}
                <button type="submit" className="btn-primary">{step === 3 ? 'Save' : 'Next'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CatalogueManagement
