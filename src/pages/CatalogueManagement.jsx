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
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [editingCatalogue, setEditingCatalogue] = useState(null)
  const [currentCatalogue, setCurrentCatalogue] = useState(null)
  const [selectedContacts, setSelectedContacts] = useState([])

  useEffect(() => {
    if (profile) {
      fetchCatalogues()
      fetchContacts()
    }
  }, [profile])

  const fetchCatalogues = async () => {
    try {
      const { data, error } = await supabase
        .from('catalogues')
        .select('*')
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setCatalogues(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load catalogues')
    } finally {
      setLoading(false)
    }
  }

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('artist_id', profile.id)
      if (error) throw error
      setContacts(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load contacts')
    }
  }

  const generateCatalogueURL = (catalogueId) => {
    return `${window.location.origin}/catalogue/${catalogueId}`
  }

  const openSendModal = (catalogue) => {
    setCurrentCatalogue(catalogue)
    setSelectedContacts([])
    setShowSendModal(true)
  }

  const sendCatalogue = async (catalogueId, contactIds, channel) => {
    if (!contactIds.length) {
      toast.error('Select at least one contact')
      return
    }

    try {
      const { data: selected, error } = await supabase
        .from('contacts')
        .select('*')
        .in('id', contactIds)
      if (error) throw error

      const url = generateCatalogueURL(catalogueId)

      if (channel === 'whatsapp') {
        selected.forEach(contact => {
          const message = encodeURIComponent(`Hi ${contact.name || ''}, check out my catalogue: ${url}`)
          const link = `https://wa.me/?text=${message}`
          window.open(link, '_blank')
        })
      } else if (channel === 'email') {
        const to = selected.map(c => c.email).join(',')
        const subject = encodeURIComponent('My New Catalogue')
        const body = encodeURIComponent(`Hi,\n\nCheck out my catalogue: ${url}`)
        window.location.href = `mailto:${to}?subject=${subject}&body=${body}`
      }

      toast.success('Catalogue sent!')
      setShowSendModal(false)
    } catch (err) {
      console.error(err)
      toast.error('Failed to send catalogue')
    }
  }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Catalogue Management</h1>
        <button
          onClick={() => setShowModal(true)}
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
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {catalogues.map(cat => (
            <div key={cat.id} className="card p-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">{cat.title}</h3>
                <div className="flex space-x-2">
                  <button onClick={() => openSendModal(cat)} title="Send Catalogue">
                    <Share2 className="h-4 w-4 text-blue-600" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-500">{cat.is_public ? 'Public' : 'Private'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Send Catalogue Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-lg p-6 relative">
            <h2 className="text-xl font-bold mb-4">Send Catalogue: {currentCatalogue.title}</h2>

            <div className="max-h-64 overflow-y-auto mb-4">
              {contacts.map(c => (
                <label key={c.id} className="flex items-center space-x-2 mb-2">
                  <input
                    type="checkbox"
                    checked={selectedContacts.includes(c.id)}
                    onChange={e => {
                      if (e.target.checked) setSelectedContacts(prev => [...prev, c.id])
                      else setSelectedContacts(prev => prev.filter(id => id !== c.id))
                    }}
                  />
                  <span>{c.name} ({c.email})</span>
                </label>
              ))}
              {contacts.length === 0 && <p className="text-gray-500">No contacts available.</p>}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => sendCatalogue(currentCatalogue.id, selectedContacts, 'whatsapp')}
                className="btn-primary w-1/2 mr-2"
              >
                WhatsApp
              </button>
              <button
                onClick={() => sendCatalogue(currentCatalogue.id, selectedContacts, 'email')}
                className="btn-secondary w-1/2 ml-2"
              >
                Email
              </button>
            </div>

            <button
              onClick={() => setShowSendModal(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CatalogueManagement
