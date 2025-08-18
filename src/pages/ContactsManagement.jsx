// src/pages/ContactsManagement.jsx
import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { parseCSV, deduplicateContacts, syncContactsWithSupabase } from '../lib/contactUtils'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const ContactsManagement = ({ selectedContacts, setSelectedContacts }) => {
  const { profile } = useAuth()
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState(null)

  useEffect(() => {
    if (profile) fetchContacts()
  }, [profile])

  // ===============================
  // Fetch Contacts
  // ===============================
  const fetchContacts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setContacts(data || [])
    } catch (err) {
      console.error('Error fetching contacts:', err)
      toast.error('Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  // ===============================
  // CSV Import
  // ===============================
  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setSelectedFile(file)

    try {
      const newContacts = await parseCSV(file)
      const uniqueContacts = deduplicateContacts(contacts, newContacts)
      await syncContactsWithSupabase(profile.id, uniqueContacts)
      toast.success(`${uniqueContacts.length} contacts added successfully`)
      fetchContacts()
    } catch (err) {
      console.error(err)
      toast.error('Failed to import contacts')
    } finally {
      setSelectedFile(null)
    }
  }

  // ===============================
  // Delete Contact
  // ===============================
  const handleDelete = async (contactId) => {
    if (!confirm('Are you sure you want to delete this contact?')) return
    try {
      const { error } = await supabase.from('contacts').delete().eq('id', contactId)
      if (error) throw error
      toast.success('Contact deleted')
      fetchContacts()
      setSelectedContacts(prev => prev.filter(id => id !== contactId))
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete contact')
    }
  }

  // ===============================
  // Toggle Selection (for catalogue send)
  // ===============================
  const toggleSelect = (contactId) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
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
        <div className="text-center py-12 text-gray-500">
          No contacts yet. Import CSV to start building your list.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map(contact => (
            <div key={contact.id} className="card p-4 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedContacts.includes(contact.id)}
                  onChange={() => toggleSelect(contact.id)}
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
      )}
    </div>
  )
}

export default ContactsManagement
