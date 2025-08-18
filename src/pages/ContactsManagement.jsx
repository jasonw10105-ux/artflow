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
  const [selectedTag, setSelectedTag] = useState('All')
  const [tags, setTags] = useState([])

  useEffect(() => {
    if (profile) fetchContacts()
  }, [profile])

  // Fetch contacts & tags
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

      // Extract unique tags
      const allTags = new Set()
      data.forEach(c => c.tags?.forEach(tag => allTags.add(tag)))
      setTags(['All', ...Array.from(allTags)])
    } catch (err) {
      console.error('Error fetching contacts:', err)
      toast.error('Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  // Toggle contact selection
  const toggleSelect = (contact) => {
    setSelectedContacts(prev =>
      prev.includes(contact.id)
        ? prev.filter(id => id !== contact.id)
        : [...prev, contact.id]
    )
  }

  // Delete contact
  const handleDelete = async (contactId) => {
    if (!confirm('Are you sure you want to delete this contact?')) return
    try {
      const { error } = await supabase.from('contacts').delete().eq('id', contactId)
      if (error) throw error
      toast.success('Contact deleted')
      fetchContacts()
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete contact')
    }
  }

  // Filter contacts by selected tag
  const filteredContacts = selectedTag === 'All'
    ? contacts
    : contacts.filter(c => c.tags?.includes(selectedTag))

  if (loading) return <div className="p-6 text-gray-500">Loading contacts...</div>

  return (
    <div className="p-4">
      {/* Tag Filter */}
      <div className="flex space-x-2 mb-4 overflow-x-auto">
        {tags.map(tag => (
          <button
            key={tag}
            className={`px-3 py-1 rounded-full text-sm ${
              selectedTag === tag ? 'bg-primary-600 text-white' : 'bg-gray-200'
            }`}
            onClick={() => setSelectedTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Contacts List */}
      {filteredContacts.length === 0 ? (
        <div className="text-gray-500 py-4 text-center">
          No contacts found{selectedTag !== 'All' ? ` for tag "${selectedTag}"` : ''}.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map(contact => (
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
                  {contact.tags?.length > 0 && (
                    <div className="flex space-x-1 mt-1">
                      {contact.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs bg-gray-200 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
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
