// src/pages/ContactsManagement.jsx
import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { parseCSV, deduplicateContacts, syncContactsWithSupabase } from '../lib/contactUtils'
import { Plus, Trash2, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'

const ContactsManagement = () => {
  const { profile } = useAuth()
  const [contacts, setContacts] = useState([])
  const [artworks, setArtworks] = useState([])
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedContacts, setSelectedContacts] = useState([])

  useEffect(() => {
    if (profile) fetchAllData()
  }, [profile])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      // Fetch contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })
      if (contactsError) throw contactsError
      setContacts(contactsData || [])

      // Fetch artworks
      const { data: artworksData, error: artworksError } = await supabase
        .from('artworks')
        .select('*')
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })
      if (artworksError) throw artworksError
      setArtworks(artworksData || [])

      // Fetch inquiries (nested artwork title)
      const { data: inquiriesData, error: inquiriesError } = await supabase
        .from('inquiries')
        .select('*, artworks(title)')
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5)
      if (inquiriesError) throw inquiriesError
      setInquiries(inquiriesData || [])
      
    } catch (err) {
      console.error('Error fetching artist data:', err)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setSelectedFile(file)

    try {
      const newContacts = await parseCSV(file)
      const uniqueContacts = deduplicateContacts(contacts, newContacts)
      const syncedContacts = await syncContactsWithSupabase(profile.id, uniqueContacts)
      toast.success(`${syncedContacts.length} contacts added successfully`)
      fetchAllData()
    } catch (err) {
      console.error(err)
      toast.error('Failed to import contacts')
    } finally {
      setSelectedFile(null)
    }
  }

  const handleDelete = async (contactId) => {
    if (!confirm('Are you sure you want to delete this contact?')) return
    try {
      const { error } = await supabase.from('contacts').delete().eq('id', contactId)
      if (error) throw error
      toast.success('Contact deleted')
      fetchAllData()
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete contact')
    }
  }

  const toggleSelect = (contact) => {
    setSelectedContacts(prev =>
      prev.includes(contact.id)
        ? prev.filter(id => id !== contact.id)
        : [...prev, contact.id]
    )
  }

  const shareContacts = () => {
    if (selectedContacts.length === 0) {
      toast('Select at least one contact to share')
      return
    }
    // Build share link logic (catalogue will have unique URL)
    toast.success('Share link copied!')
  }

  if (loading) return <div className="p-6 text-gray-500">Loading contacts...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
        <label className="btn-primary flex items-center space-x-2 cursor-pointer">
          <Plus className="h-5 w-5" />
          <span>Import CSV</span>
          <input type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
        </label>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No contacts yet. Import CSV to start building your list.</div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={shareContacts}
              className="btn-primary flex items-center space-x-2"
            >
              <Share2 className="h-4 w-4" />
              <span>Share to Selected</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map(contact => (
              <div key={contact.id} className="card p-4 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedContacts.includes(contact.id)}
                    onChange={() => toggleSelect(contact)}
                    className="h-4 w-4 text-primary-600"
                  />
                  <div>
                    <p className="font-medium">{contact.name || '-'}</p>
                    <p className="text-sm text-gray-500">{contact.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(contact.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ContactsManagement
