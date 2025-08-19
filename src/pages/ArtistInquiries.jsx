import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Eye, Mail, Archive, MessageSquare, Search, Filter } from 'lucide-react'
import Modal from '../components/Modal'
import LoadingSpinner from '../components/LoadingSpinner'

const ArtistInquiries = () => {
  const { profile, user } = useAuth()
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedInquiry, setSelectedInquiry] = useState(null)
  const [filter, setFilter] = useState('all') // all, new, read, replied, archived
  const [searchTerm, setSearchTerm] = useState('')

  const fetchInquiries = useCallback(async () => {
    if (!profile?.id) return
    
    setLoading(true)
    try {
      let query = supabase
        .from('inquiries')
        .select(`
          *,
          artwork:artwork_id(id, title, image_url),
          collector:collector_id(id, name, email)
        `)
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })

      const { data, error } = await query
      
      if (error) throw error
      
      setInquiries(data || [])
    } catch (err) {
      console.error('Fetch inquiries error:', err)
      toast.error('Failed to fetch inquiries')
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    fetchInquiries()
  }, [fetchInquiries])

  const updateInquiryStatus = async (inquiryId, newStatus) => {
    if (!user) return
    
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('inquiries')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', inquiryId)
        .eq('artist_id', profile.id) // Ensure user can only update their own inquiries

      if (error) throw error

      // Update local state
      setInquiries(prev => prev.map(inq => 
        inq.id === inquiryId 
          ? { ...inq, status: newStatus }
          : inq
      ))

      toast.success(`Inquiry marked as ${newStatus}`)
    } catch (err) {
      console.error('Update inquiry error:', err)
      toast.error('Failed to update inquiry')
    } finally {
      setUpdating(false)
    }
  }

  const openModal = (inquiry) => {
    setSelectedInquiry(inquiry)
    setModalOpen(true)
    
    // Mark as read if it's new
    if (inquiry.status === 'new') {
      updateInquiryStatus(inquiry.id, 'read')
    }
  }

  const closeModal = () => {
    setSelectedInquiry(null)
    setModalOpen(false)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800'
      case 'read':
        return 'bg-yellow-100 text-yellow-800'
      case 'replied':
        return 'bg-green-100 text-green-800'
      case 'archived':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredInquiries = inquiries.filter(inq => {
    const matchesFilter = filter === 'all' || inq.status === filter
    const matchesSearch = searchTerm === '' || 
      inq.contact_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inq.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inq.artwork?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inq.collector?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesFilter && matchesSearch
  })

  if (!profile) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    )
  }

  if (loading) {
    return <LoadingSpinner />
  }

  const statusCounts = {
    all: inquiries.length,
    new: inquiries.filter(i => i.status === 'new').length,
    read: inquiries.filter(i => i.status === 'read').length,
    replied: inquiries.filter(i => i.status === 'replied').length,
    archived: inquiries.filter(i => i.status === 'archived').length,
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Inquiries</h1>
        <p className="text-gray-600">Manage collector inquiries about your artworks</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search inquiries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All ({statusCounts.all})</option>
              <option value="new">New ({statusCounts.new})</option>
              <option value="read">Read ({statusCounts.read})</option>
              <option value="replied">Replied ({statusCounts.replied})</option>
              <option value="archived">Archived ({statusCounts.archived})</option>
            </select>
          </div>
        </div>
      </div>

      {filteredInquiries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <MessageSquare className="w-20 h-20 mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">
            {inquiries.length === 0 ? 'No inquiries yet' : 'No matching inquiries'}
          </h2>
          <p className="text-gray-500 text-center max-w-md">
            {inquiries.length === 0
              ? 'When collectors are interested in your work, their inquiries will appear here.'
              : 'Try adjusting your search or filter to find what you\'re looking for.'
            }
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Artwork
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message Preview
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInquiries.map((inquiry) => (
                  <tr key={inquiry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Mail className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {inquiry.collector?.name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {inquiry.contact_email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {inquiry.artwork?.image_url ? (
                          <img
                            src={inquiry.artwork.image_url}
                            alt={inquiry.artwork.title}
                            className="h-12 w-12 rounded-lg object-cover mr-3"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center mr-3">
                            <MessageSquare className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {inquiry.artwork?.title || 'General Inquiry'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {inquiry.message}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(inquiry.status)}`}>
                        {inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(inquiry.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openModal(inquiry)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        {inquiry.status !== 'archived' && (
                          <button
                            onClick={() => updateInquiryStatus(inquiry.id, 'archived')}
                            disabled={updating}
                            className="text-gray-600 hover:text-gray-900 p-1"
                            title="Archive"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inquiry Detail Modal */}
      {modalOpen && selectedInquiry && (
        <Modal onClose={closeModal} title="Inquiry Details">
          <div className="space-y-6">
            {/* Collector Info */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Collector Information</h3>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Name:</span>{' '}
                  {selectedInquiry.collector?.name || 'Not provided'}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Email:</span>{' '}
                  <a 
                    href={`mailto:${selectedInquiry.contact_email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {selectedInquiry.contact_email}
                  </a>
                </div>
              </div>
            </div>

            {/* Artwork Info */}
            {selectedInquiry.artwork && (
              <div className="border-b pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Artwork</h3>
                <div className="flex items-center space-x-3">
                  {selectedInquiry.artwork.image_url && (
                    <img
                      src={selectedInquiry.artwork.image_url}
                      alt={selectedInquiry.artwork.title}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <div className="font-medium text-gray-900">
                      {selectedInquiry.artwork.title}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Message */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Message</h3>
              <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-700 whitespace-pre-wrap">
                {selectedInquiry.message}
              </div>
            </div>

            {/* Status and Actions */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Status & Actions</h3>
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedInquiry.status)}`}>
                  {selectedInquiry.status.charAt(0).toUpperCase() + selectedInquiry.status.slice(1)}
                </span>
                
                <div className="flex space-x-2">
                  {selectedInquiry.status !== 'replied' && (
                    <button
                      onClick={() => {
                        updateInquiryStatus(selectedInquiry.id, 'replied')
                        closeModal()
                      }}
                      disabled={updating}
                      className="btn-primary text-sm"
                    >
                      Mark as Replied
                    </button>
                  )}
                  
                  <a
                    href={`mailto:${selectedInquiry.contact_email}?subject=Re: Your inquiry about ${selectedInquiry.artwork?.title || 'my artwork'}`}
                    className="btn-secondary text-sm"
                  >
                    Reply via Email
                  </a>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="text-xs text-gray-500 pt-4 border-t">
              <div>Received: {new Date(selectedInquiry.created_at).toLocaleString()}</div>
              {selectedInquiry.updated_at !== selectedInquiry.created_at && (
                <div>Updated: {new Date(selectedInquiry.updated_at).toLocaleString()}</div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default ArtistInquiries
