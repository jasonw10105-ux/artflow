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
  const [showSendModal, setShowSendModal] = useState(false)
  const [editingCatalogue, setEditingCatalogue] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_public: true,
    password: '',
    artwork_ids: []
  })
  const [generatingPDF, setGeneratingPDF] = useState(false)

  // Schedule send states
  const [scheduleSendEnabled, setScheduleSendEnabled] = useState(false)
  const [scheduledSend, setScheduledSend] = useState(null)
  const [selectedContacts, setSelectedContacts] = useState([])
  const [sendChannel, setSendChannel] = useState('email') // 'email' | 'whatsapp'

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
    setScheduleSendEnabled(false)
    setScheduledSend(null)
    setSelectedContacts([])
    setSendChannel('email')
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

        if (i > 0) pdf.addPage()

        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            img.src = artwork.image_url
          })

          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')

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

          const detailsY = 20 + height + 20
          pdf.setFontSize(16)
          pdf.text(artwork.title, 20, detailsY)

          pdf.setFontSize(12)
          let currentY = detailsY + 15
          if (artwork.medium) { pdf.text(`Medium: ${artwork.medium}`, 20, currentY); currentY += 15 }
          if (artwork.dimensions) { pdf.text(`Dimensions: ${artwork.dimensions}`, 20, currentY); currentY += 15 }
          if (artwork.year) { pdf.text(`Year: ${artwork.year}`, 20, currentY); currentY += 15 }
          if (artwork.description) {
            const descLines = pdf.splitTextToSize(artwork.description, pageWidth - 40)
            pdf.text(descLines, 20, currentY)
          }
        } catch (imgError) {
          console.error('Error loading image:', imgError)
        }
      }

      pdf.save(`${catalogue.title}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF')
    } finally {
      setGeneratingPDF(false)
    }
  }

  const generateCatalogueURL = (catalogueId) => {
    return `${window.location.origin}/catalogue/${catalogueId}`
  }

  const sendCatalogue = async (catalogueId) => {
    if (!selectedContacts.length) {
      toast.error('Select at least one contact')
      return
    }

    try {
      // Save scheduled_send if enabled
      await supabase
        .from('catalogues')
        .update({ scheduled_send: scheduleSendEnabled ? scheduledSend : null })
        .eq('id', catalogueId)

      const now = new Date()
      if (!scheduleSendEnabled || new Date(scheduledSend) <= now) {
        // Send immediately
        const { data: contacts, error } = await supabase
          .from('contacts')
          .select('*')
          .in('id', selectedContacts)
        if (error) throw error

        const url = generateCatalogueURL(catalogueId)

        if (sendChannel === 'whatsapp') {
          contacts.forEach(contact => {
            const message = encodeURIComponent(`Hi ${contact.name || ''}, check out my catalogue: ${url}`)
            window.open(`https://wa.me/?text=${message}`, '_blank')
          })
        } else if (sendChannel === 'email') {
          const to = contacts.map(c => c.email).join(',')
          const subject = encodeURIComponent('My New Catalogue')
          const body = encodeURIComponent(`Hi,\n\nCheck out my catalogue: ${url}`)
          window.location.href = `mailto:${to}?subject=${subject}&body=${body}`
        }

        toast.success('Catalogue sent!')
      } else {
        toast.success('Catalogue scheduled to send!')
      }

      setShowSendModal(false)
      resetForm()
    } catch (err) {
      console.error(err)
      toast.error('Failed to send catalogue')
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your Catalogues</h2>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="bg-primary-600 text-white px-4 py-2 rounded flex items-center space-x-2"
        >
          <Plus size={16}/> <span>Create Catalogue</span>
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {catalogues.map(catalogue => (
            <div key={catalogue.id} className="border rounded p-4 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold">{catalogue.title}</h3>
                <p className="text-sm text-gray-500">{new Date(catalogue.created_at).toLocaleDateString()}</p>
                <p className="mt-2 text-sm">{catalogue.description}</p>
              </div>
              <div className="flex space-x-2 mt-4">
                <button onClick={() => handleEdit(catalogue)} className="p-2 border rounded"><Edit size={16}/></button>
                <button onClick={() => handleDelete(catalogue.id)} className="p-2 border rounded"><Trash2 size={16}/></button>
                <button onClick={() => generatePDF(catalogue)} className="p-2 border rounded"><Download size={16}/></button>
                <button onClick={() => { setEditingCatalogue(catalogue); setShowSendModal(true) }} className="p-2 border rounded"><Share2 size={16}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded w-full max-w-lg relative">
            <button onClick={() => setShowModal(false)} className="absolute top-2 right-2"><X size={20}/></button>
            <h3 className="text-xl font-semibold mb-4">{editingCatalogue ? 'Edit Catalogue' : 'Create Catalogue'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full border rounded p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full border rounded p-2"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="is_public"
                  checked={formData.is_public}
                  onChange={handleInputChange}
                />
                <label>Public</label>
              </div>

              {!formData.is_public && (
                <div>
                  <label>Password</label>
                  <input
                    type="text"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full border rounded p-2"
                    required
                  />
                </div>
              )}

              <div>
                <label>Artworks</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border p-2 rounded">
                  {artworks.map(artwork => (
                    <label key={artwork.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.artwork_ids.includes(artwork.id)}
                        onChange={() => handleArtworkSelection(artwork.id)}
                      />
                      <span className="text-sm">{artwork.title}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded flex items-center space-x-2">
                <Save size={16}/> <span>Save</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Send Modal */}
      {showSendModal && editingCatalogue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded w-full max-w-md relative">
            <button onClick={() => setShowSendModal(false)} className="absolute top-2 right-2"><X size={20}/></button>
            <h3 className="text-xl font-semibold mb-4">Send Catalogue: {editingCatalogue.title}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select Contacts</label>
                <select
                  multiple
                  value={selectedContacts}
                  onChange={e => setSelectedContacts(Array.from(e.target.selectedOptions, o => o.value))}
                  className="w-full border rounded p-2 h-32"
                >
                  {/* Replace with your contacts */}
                  <option value="contact1">Contact 1</option>
                  <option value="contact2">Contact 2</option>
                  <option value="contact3">Contact 3</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Send Channel</label>
                <select
                  value={sendChannel}
                  onChange={e => setSendChannel(e.target.value)}
                  className="w-full border rounded p-2"
                >
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={scheduleSendEnabled}
                  onChange={(e) => setScheduleSendEnabled(e.target.checked)}
                />
                <label>Schedule Send</label>
              </div>

              {scheduleSendEnabled && (
                <div>
                  <label className="block text-sm font-medium mb-1">Select Date & Time</label>
                  <input
                    type="datetime-local"
                    value={scheduledSend || ''}
                    onChange={e => setScheduledSend(e.target.value)}
                    className="w-full border rounded p-2"
                  />
                </div>
              )}

              <button
                onClick={() => sendCatalogue(editingCatalogue.id)}
                className="bg-primary-600 text-white px-4 py-2 rounded"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default CatalogueManagement
