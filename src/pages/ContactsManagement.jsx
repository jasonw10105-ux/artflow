import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Eye, Edit2, Trash2 } from 'lucide-react'
import Modal from '../components/Modal'

const ContactsManagement = ({ selectedContacts, setSelectedContacts }) => {
  const { profile } = useAuth()
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('view')
  const [selectedContact, setSelectedContact] = useState(null)
  const [contactForm, setContactForm] = useState({ name: '', email: '', tags: '' })

  useEffect(() => {
    if (profile?.id) fetchContacts()
  }, [profile])

  const fetchContacts = async () => {
    if (!profile?.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setContacts(data || [])
      if (setSelectedContacts) setSelectedContacts([])
    } catch (err) {
      console.error(err)
      toast.error('Failed to fetch contacts')
    } finally {
      setLoading(false)
    }
  }

  const openModal = (contact, mode = 'view') => {
    setSelectedContact(contact)
    setModalMode(mode)
    if (mode === 'edit') {
      setContactForm({
        name: contact.name || '',
        email: contact.email || '',
        tags: contact.tags?.join(', ') || '',
      })
    }
    setModalOpen(true)
  }

  const closeModal = () => {
    setSelectedContact(null)
    setModalOpen(false)
  }

  const saveContact = async () => {
    if (!selectedContact) return
    try {
      const updated = {
        name: contactForm.name,
        email: contactForm.email,
        tags: contactForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      }
      const { error } = await supabase
        .from('contacts')
        .update(updated)
        .eq('id', selectedContact.id)

      if (error) throw error
      toast.success('Contact updated')
      fetchContacts()
      closeModal()
    } catch (err) {
      console.error(err)
      toast.error('Failed to update contact')
    }
  }

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

  const toggleSelect = (contactId) => {
    if (!setSelectedContacts) return
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }

  const toggleSelectAll = () => {
    if (!setSelectedContacts) return
    setSelectedContacts(selectedContacts.length === contacts.length ? [] : contacts.map(c => c.id))
  }

  if (!profile) return <div className="p-6 text-gray-500">Loading profile...</div>
  if (loading) return <div className="p-6 text-gray-500">Loading contacts...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Contacts</h1>

      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <svg
            className="w-20 h-20 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-lg">You have no contacts yet.</p>
          <p className="text-sm text-gray-500">Add a contact to start building your network.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selectedContacts.length === contacts.length && contacts.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Tags</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contacts.map(contact => (
                <tr key={contact.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(contact.id)}
                      onChange={() => toggleSelect(contact.id)}
                    />
                  </td>
                  <td className="px-4 py-2">{contact.name || '-'}</td>
                  <td className="px-4 py-2">{contact.email || '-'}</td>
                  <td className="px-4 py-2">
                    {contact.tags?.map(tag => (
                      <span key={tag} className="inline-block px-2 py-0.5 mr-1 text-xs bg-gray-200 rounded-full">{tag}</span>
                    ))}
                  </td>
                  <td className="px-4 py-2 flex space-x-2">
                    <button onClick={() => openModal(contact, 'view')} className="text-blue-600 hover:underline flex items-center">
                      <Eye className="h-4 w-4 mr-1" /> View
                    </button>
                    <button onClick={() => openModal(contact, 'edit')} className="text-green-600 hover:underline flex items-center">
                      <Edit2 className="h-4 w-4 mr-1" /> Edit
                    </button>
                    <button onClick={() => handleDelete(contact.id)} className="text-red-600 hover:underline flex items-center">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && selectedContact && (
        <Modal onClose={closeModal} title={modalMode === 'edit' ? 'Edit Contact' : 'Contact Details'}>
          {modalMode === 'edit' ? (
            <div className="space-y-4">
              <input
                type="text"
                value={contactForm.name}
                onChange={e => setContactForm({...contactForm, name: e.target.value})}
                className="input w-full"
                placeholder="Name"
              />
              <input
                type="email"
                value={contactForm.email}
                onChange={e => setContactForm({...contactForm, email: e.target.value})}
                className="input w-full"
                placeholder="Email"
              />
              <input
                type="text"
                value={contactForm.tags}
                onChange={e => setContactForm({...contactForm, tags: e.target.value})}
                className="input w-full"
                placeholder="Tags (comma-separated)"
              />
              <div className="flex justify-end space-x-2">
                <button onClick={closeModal} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                <button onClick={saveContact} className="px-4 py-2 bg-green-600 text-white rounded">Save</button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p><strong>Name:</strong> {selectedContact.name}</p>
              <p><strong>Email:</strong> {selectedContact.email}</p>
              <p><strong>Tags:</strong> {selectedContact.tags?.join(', ') || '-'}</p>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

export default ContactsManagement
