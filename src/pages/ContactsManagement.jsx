// src/pages/ContactsManagement.jsx
import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Trash2, Edit2, Eye } from 'lucide-react'
import Modal from '../components/Modal' // Assume you have a simple Modal component

const ContactsManagement = ({ selectedContacts, setSelectedContacts }) => {
  const { profile } = useAuth()
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' })

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('view') // 'view' or 'edit'
  const [selectedContact, setSelectedContact] = useState(null)
  const [contactForm, setContactForm] = useState({ name: '', email: '', tags: '' })
  const [relatedData, setRelatedData] = useState({ artworks: [], inquiries: [], sales: [] })

  useEffect(() => {
    if (profile) fetchContacts()
  }, [profile])

  // Fetch contacts
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
      console.error(err)
      toast.error('Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  const openModal = async (contact, mode = 'view') => {
    setSelectedContact(contact)
    setModalMode(mode)
    if (mode === 'edit') {
      setContactForm({
        name: contact.name || '',
        email: contact.email || '',
        tags: contact.tags?.join(', ') || '',
      })
    } else if (mode === 'view') {
      // Fetch related artworks, inquiries, sales
      try {
        const [artworksRes, inquiriesRes, salesRes] = await Promise.all([
          supabase.from('artworks').select('*').eq('artist_id', profile.id),
          supabase.from('inquiries').select('*').eq('artist_id', profile.id).eq('contact_email', contact.email),
          supabase.from('sales').select('*').eq('artist_id', profile.id).eq('collector_id', contact.id)
        ])
        setRelatedData({
          artworks: artworksRes.data || [],
          inquiries: inquiriesRes.data || [],
          sales: salesRes.data || []
        })
      } catch (err) {
        console.error(err)
        toast.error('Failed to fetch related data')
      }
    }
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setSelectedContact(null)
    setRelatedData({ artworks: [], inquiries: [], sales: [] })
  }

  const saveContact = async () => {
    try {
      const updatedContact = {
        name: contactForm.name,
        email: contactForm.email,
        tags: contactForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      }
      const { error } = await supabase
        .from('contacts')
        .update(updatedContact)
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
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(contacts.map(c => c.id))
    }
  }

  const sortedContacts = React.useMemo(() => {
    const sortable = [...contacts]
    if (sortConfig !== null) {
      sortable.sort((a, b) => {
        const aVal = a[sortConfig.key] ?? ''
        const bVal = b[sortConfig.key] ?? ''
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortable
  }, [contacts, sortConfig])

  const requestSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc'
    setSortConfig({ key, direction })
  }

  if (loading) return <div className="p-6 text-gray-500">Loading contacts...</div>

  return (
    <div className="p-4">
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2">
                <input
                  type="checkbox"
                  checked={selectedContacts.length === contacts.length && contacts.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 text-primary-600"
                />
              </th>
              <th className="px-4 py-2 text-left cursor-pointer" onClick={() => requestSort('name')}>
                Name
              </th>
              <th className="px-4 py-2 text-left cursor-pointer" onClick={() => requestSort('email')}>
                Email
              </th>
              <th className="px-4 py-2 text-left">Tags</th>
              <th className="px-4 py-2 text-left cursor-pointer" onClick={() => requestSort('created_at')}>
                Created At
              </th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedContacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-4 text-gray-500">
                  No contacts found.
                </td>
              </tr>
            ) : (
              sortedContacts.map(contact => (
                <tr key={contact.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(contact.id)}
                      onChange={() => toggleSelect(contact.id)}
                      className="h-4 w-4 text-primary-600"
                    />
                  </td>
                  <td className="px-4 py-2">{contact.name || '-'}</td>
                  <td className="px-4 py-2">{contact.email || '-'}</td>
                  <td className="px-4 py-2">
                    {contact.tags?.map(tag => (
                      <span
                        key={tag}
                        className="inline-block px-2 py-0.5 mr-1 text-xs bg-gray-200 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </td>
                  <td className="px-4 py-2">{new Date(contact.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2 flex space-x-2">
                    <button onClick={() => openModal(contact, 'view')} className="text-blue-600 hover:underline flex items-center">
                      <Eye className="h-4 w-4 mr-1" /> View
                    </button>
                    <button onClick={() => openModal(contact, 'edit')} className="text-green-600 hover:underline flex items-center">
                      <Edit2 className="h-4 w-4 mr-1" /> Edit
                    </button>
                    <button onClick={() => handleDelete(contact.id)} className="text-red-600 hover:underline">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && selectedContact && (
        <Modal onClose={closeModal} title={modalMode === 'edit' ? 'Edit Contact' : 'Contact Details'}>
          {modalMode === 'edit' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="mt-1 w-full border px-2 py-1 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="mt-1 w-full border px-2 py-1 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={contactForm.tags}
                  onChange={(e) => setContactForm({ ...contactForm, tags: e.target.value })}
                  className="mt-1 w-full border px-2 py-1 rounded"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button onClick={closeModal} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                <button onClick={saveContact} className="px-4 py-2 bg-green-600 text-white rounded">Save</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p><strong>Name:</strong> {selectedContact.name}</p>
                <p><strong>Email:</strong> {selectedContact.email}</p>
                <p><strong>Tags:</strong> {selectedContact.tags?.join(', ') || '-'}</p>
              </div>

              <div>
                <h4 className="font-medium mt-4">Artworks</h4>
                {relatedData.artworks.length === 0 ? <p>No artworks</p> : (
                  <ul className="list-disc pl-5">
                    {relatedData.artworks.map(a => (
                      <li key={a.id}>
                        <a href={`/artworks/${a.id}`} className="text-blue-600 hover:underline">{a.title}</a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4 className="font-medium mt-4">Inquiries</h4>
                {relatedData.inquiries.length === 0 ? <p>No inquiries</p> : (
                  <ul className="list-disc pl-5">
                    {relatedData.inquiries.map(i => (
                      <li key={i.id}>
                        <a href={`/inquiries/${i.id}`} className="text-blue-600 hover:underline">{i.message.slice(0, 50)}...</a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4 className="font-medium mt-4">Sales</h4>
                {relatedData.sales.length === 0 ? <p>No sales</p> : (
                  <ul className="list-disc pl-5">
                    {relatedData.sales.map(s => (
                      <li key={s.id}>
                        <a href={`/sales/${s.id}`} className="text-blue-600 hover:underline">{s.amount} {s.currency}</a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

export default ContactsManagement
