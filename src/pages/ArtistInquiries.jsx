import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Mail, Send, X, Eye, EyeOff } from 'lucide-react'
import { isToday, isYesterday } from 'date-fns'

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  responded: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800'
}

const FILTER_OPTIONS = ['All', 'Pending', 'Responded', 'Closed']
const SORT_OPTIONS = ['Newest First', 'Oldest First']

const ArtistInquiries = () => {
  const { profile } = useAuth()
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedInquiry, setSelectedInquiry] = useState(null)
  const [responseMessage, setResponseMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [sortOption, setSortOption] = useState('Newest First')
  const [unreadIds, setUnreadIds] = useState(new Set())
  const [selectedIds, setSelectedIds] = useState(new Set())

  useEffect(() => {
    if (profile) fetchInquiries()
  }, [profile])

  const fetchInquiries = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .select(`
          *,
          artworks(title),
          contacts:contacts!contacts_artist_id_fkey(name, email, phone, tags)
        `)
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const mappedData = data.map(i => ({
        ...i,
        contacts: i.contacts?.find(c => c.email === i.contact_email) || null
      }))

      setInquiries(mappedData)
      setUnreadIds(new Set(mappedData.filter(i => i.status === 'pending' && !i.response_message).map(i => i.id)))
    } catch (err) {
      console.error(err)
      toast.error('Failed to load inquiries')
    } finally {
      setLoading(false)
    }
  }

  const respondToInquiry = async (inquiry) => {
    if (!responseMessage) return toast.error('Please enter a response message')

    try {
      // 1️⃣ Update inquiry
      await supabase
        .from('inquiries')
        .update({
          status: 'responded',
          response_message: responseMessage,
          updated_at: new Date()
        })
        .eq('id', inquiry.id)

      // 2️⃣ Auto-add collector as contact if not exists
      if (inquiry.collector_id) {
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('artist_id', profile.id)
          .eq('email', inquiry.contact_email)
          .single()

        if (!existingContact) {
          await supabase.from('contacts').insert({
            artist_id: profile.id,
            name: inquiry.contacts?.name || null,
            email: inquiry.contact_email,
            phone: inquiry.contacts?.phone || null,
            tags: ['inquirer']
          })
        }
      }

      toast.success('Response sent successfully!')
      setSelectedInquiry(null)
      setResponseMessage('')
      fetchInquiries()
    } catch (err) {
      console.error(err)
      toast.error('Failed to send response')
    }
  }

  const toggleUnread = (id) => {
    const updated = new Set(unreadIds)
    if (unreadIds.has(id)) updated.delete(id)
    else updated.add(id)
    setUnreadIds(updated)
  }

  const toggleSelect = (id) => {
    const updated = new Set(selectedIds)
    if (selectedIds.has(id)) updated.delete(id)
    else updated.add(id)
    setSelectedIds(updated)
  }

  const selectAll = () => setSelectedIds(new Set(filteredInquiries.map(i => i.id)))
  const deselectAll = () => setSelectedIds(new Set())
  const bulkMarkReadUnread = (markAsRead) => {
    const updated = new Set(unreadIds)
    selectedIds.forEach(id => {
      if (markAsRead) updated.delete(id)
      else updated.add(id)
    })
    setUnreadIds(updated)
  }
  const bulkClose = async () => {
    try {
      await supabase
        .from('inquiries')
        .update({ status: 'closed', updated_at: new Date() })
        .in('id', Array.from(selectedIds))
      toast.success('Inquiries closed')
      setSelectedIds(new Set())
      fetchInquiries()
    } catch (err) {
      console.error(err)
      toast.error('Failed to close inquiries')
    }
  }

  const filteredInquiries = useMemo(() => {
    let data = [...inquiries]
    if (filterStatus !== 'All') {
      data = data.filter(i => i.status.toLowerCase() === filterStatus.toLowerCase())
    }
    if (searchQuery) {
      data = data.filter(
        i =>
          i.contact_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (i.artworks?.title || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    data.sort((a, b) => {
      const diff = new Date(a.created_at) - new Date(b.created_at)
      return sortOption === 'Newest First' ? -diff : diff
    })
    return data
  }, [inquiries, filterStatus, searchQuery, sortOption])

  const groupedInquiries = useMemo(() => {
    const groups = { Today: [], Yesterday: [], Earlier: [] }
    filteredInquiries.forEach(i => {
      const date = new Date(i.created_at)
      if (isToday(date)) groups.Today.push(i)
      else if (isYesterday(date)) groups.Yesterday.push(i)
      else groups.Earlier.push(i)
    })
    return groups
  }, [filteredInquiries])

  if (loading) return <div className="p-6 text-gray-500">Loading inquiries...</div>

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar/List */}
      <aside className="w-96 border-r border-gray-200 overflow-y-auto flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Mail size={24} /> Inquiries
          </h1>

          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search inquiries..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2 mb-4">
            {FILTER_OPTIONS.map(option => (
              <button
                key={option}
                className={`px-3 py-1 rounded ${
                  filterStatus === option ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
                } text-sm`}
                onClick={() => setFilterStatus(option)}
              >
                {option}
              </button>
            ))}
          </div>

          {selectedIds.size > 0 && (
            <div className="mb-4 flex flex-col gap-2">
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>{selectedIds.size} selected</span>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="px-2 py-1 bg-gray-200 rounded text-sm">Select All</button>
                  <button onClick={deselectAll} className="px-2 py-1 bg-gray-200 rounded text-sm">Deselect All</button>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => bulkMarkReadUnread(true)}
                  className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm flex items-center gap-1"
                >
                  <EyeOff size={14} /> Mark as Read
                </button>
                <button
                  onClick={() => bulkMarkReadUnread(false)}
                  className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm flex items-center gap-1"
                >
                  <Eye size={14} /> Mark as Unread
                </button>
                <button
                  onClick={bulkClose}
                  className="px-3 py-1 bg-gray-200 text-gray-800 rounded text-sm flex items-center gap-1"
                >
                  <X size={14} /> Close
                </button>
              </div>
            </div>
          )}

          {filteredInquiries.length === 0 && <p className="text-gray-500">No inquiries yet.</p>}

          <ul className="space-y-2">
            {Object.entries(groupedInquiries).map(([groupName, groupItems]) =>
              groupItems.length > 0 ? (
                <li key={groupName}>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{groupName}</p>
                  {groupItems.map(inquiry => (
                    <div
                      key={inquiry.id}
                      className={`relative p-3 bg-white rounded-lg shadow hover:shadow-md cursor-pointer flex justify-between items-start transition ${
                        selectedInquiry?.id === inquiry.id ? 'ring-2 ring-indigo-500' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(inquiry.id)}
                        onChange={() => toggleSelect(inquiry.id)}
                        className="mr-2 mt-1"
                      />
                      <div
                        className="flex-1 flex flex-col gap-1"
                        onClick={() => setSelectedInquiry(inquiry)}
                      >
                        <p className="font-medium">{inquiry.artworks?.title || 'Unknown Artwork'}</p>
                        <p className="text-sm text-gray-500">{inquiry.contacts?.name || inquiry.contact_email}</p>
                        <p className="text-sm mt-1 text-gray-700 line-clamp-2">{inquiry.message}</p>
                      </div>
                      <span
                        className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                          STATUS_COLORS[inquiry.status]
                        }`}
                      >
                        {inquiry.status}
                      </span>
                      {unreadIds.has(inquiry.id) && (
                        <Eye className="absolute top-2 right-2 text-indigo-500" size={16} />
                      )}
                    </div>
                  ))}
                </li>
              ) : null
            )}
          </ul>
        </div>
      </aside>

      {/* Detail Panel */}
      <main className="flex-1 p-6 overflow-y-auto">
        {selectedInquiry ? (
          <div className="bg-white rounded-lg shadow p-6 space-y-4 max-w-3xl mx-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Inquiry from {selectedInquiry.contact_email}</h2>
              <button
                className="p-1 rounded hover:bg-gray-100"
                onClick={() => {
                  setSelectedInquiry(null)
                  setResponseMessage('')
                }}
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-600">Artwork: {selectedInquiry.artworks?.title || 'Unknown'}</p>
            <p className="mt-2 text-gray-700">{selectedInquiry.message}</p>

            {selectedInquiry.status === 'pending' && (
              <>
                <textarea
                  className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Type your response..."
                  value={responseMessage}
                  onChange={e => setResponseMessage(e.target.value)}
                  rows={5}
                />
                <button
                  className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-2"
                  onClick={() => respondToInquiry(selectedInquiry)}
                >
                  <Send size={16} /> Send Response
                </button>
              </>
            )}

            {selectedInquiry.response_message && (
              <div className="mt-4 p-4 bg-green-50 rounded text-green-800">
                <strong>Response Sent:</strong> {selectedInquiry.response_message}
              </div>
            )}

            <button
              className="mt-4 text-sm text-indigo-600 hover:underline flex items-center gap-1"
              onClick={() => toggleUnread(selectedInquiry.id)}
            >
              {unreadIds.has(selectedInquiry.id) ? <EyeOff size={16} /> : <Eye size={16} />}
              Mark as {unreadIds.has(selectedInquiry.id) ? 'Read' : 'Unread'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            No inquiry selected
          </div>
        )}
      </main>
    </div>
  )
}

export default ArtistInquiries
