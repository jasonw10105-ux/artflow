import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Eye } from 'lucide-react'
import Modal from '../components/Modal'

const ArtistInquiries = () => {
  const { profile } = useAuth()
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedInquiry, setSelectedInquiry] = useState(null)

  useEffect(() => {
    if (profile?.id) fetchInquiries()
  }, [profile])

  const fetchInquiries = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .select(`
          *,
          artwork:artwork_id(id, title, image_url),
          artist:artist_id(id, name, public_code)
        `)
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setInquiries(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to fetch inquiries')
    } finally {
      setLoading(false)
    }
  }

  const openModal = (inquiry) => {
    setSelectedInquiry(inquiry)
    setModalOpen(true)
  }

  const closeModal = () => {
    setSelectedInquiry(null)
    setModalOpen(false)
  }

  if (!profile) return <div className="p-6 text-gray-500">Loading profile...</div>
  if (loading) return <div className="p-6 text-gray-500">Loading inquiries...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Your Inquiries</h1>

      {inquiries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <svg
            className="w-20 h-20 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-4-4v4m0 8v4m-4-4h8" />
          </svg>
          <p className="text-lg">You have no inquiries yet.</p>
          <p className="text-sm text-gray-500">Once collectors reach out, they’ll appear here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Collector Email</th>
                <th className="px-4 py-2 text-left">Artwork</th>
                <th className="px-4 py-2 text-left">Message</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inquiries.map((inq) => (
                <tr key={inq.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{inq.contact_email}</td>
                  <td className="px-4 py-2">{inq.artwork?.title || '-'}</td>
                  <td className="px-4 py-2">{inq.message.slice(0, 50)}{inq.message.length > 50 ? '...' : ''}</td>
                  <td className="px-4 py-2">{inq.status}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => openModal(inq)}
                      className="text-blue-600 hover:underline flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-1" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && selectedInquiry && (
        <Modal onClose={closeModal} title="Inquiry Details">
          <p><strong>Collector Email:</strong> {selectedInquiry.contact_email}</p>
          <p><strong>Artwork:</strong> {selectedInquiry.artwork?.title || '-'}</p>
          <p><strong>Message:</strong> {selectedInquiry.message}</p>
          <p><strong>Status:</strong> {selectedInquiry.status}</p>
        </Modal>
      )}
    </div>
  )
}

export default ArtistInquiries
