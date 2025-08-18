import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const ArtistInquiries = () => {
  const { profile } = useAuth()
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedInquiry, setSelectedInquiry] = useState(null)
  const [responseMessage, setResponseMessage] = useState('')

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
          artworks(title)
        `)
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setInquiries(data)
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
      // Update inquiry status and save response
      await supabase
        .from('inquiries')
        .update({
          status: 'responded',
          response_message: responseMessage,
          responded_at: new Date()
        })
        .eq('id', inquiry.id)

      toast.success('Response sent successfully!')
      setSelectedInquiry(null)
      setResponseMessage('')
      fetchInquiries()
    } catch (err) {
      console.error(err)
      toast.error('Failed to send response')
    }
  }

  if (loading) return <div className="p-6 text-gray-500">Loading inquiries...</div>

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Artist Inquiries</h1>
      {inquiries.length === 0 && <p className="text-gray-500">No inquiries yet.</p>}

      <div className="space-y-4">
        {inquiries.map(inquiry => (
          <div key={inquiry.id} className="border rounded p-4 shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{inquiry.artworks?.title || 'Unknown Artwork'}</p>
                <p className="text-sm text-gray-600">
                  From: {inquiry.user_email} | Type: {inquiry.type} | Status: {inquiry.status}
                </p>
                <p className="text-sm mt-2">{inquiry.message}</p>
                {inquiry.response_message && (
                  <p className="text-sm mt-2 text-green-600">Response: {inquiry.response_message}</p>
                )}
              </div>
              {inquiry.status === 'pending' && (
                <button
                  className="btn-primary text-sm px-3 py-1"
                  onClick={() => setSelectedInquiry(inquiry)}
                >
                  Respond
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedInquiry && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-lg font-bold mb-2">Respond to {selectedInquiry.user_email}</h2>
            <p className="mb-4">Artwork: {selectedInquiry.artworks?.title || 'Unknown'}</p>
            <textarea
              className="input w-full mb-4"
              placeholder="Enter your response"
              value={responseMessage}
              onChange={e => setResponseMessage(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <button
                className="btn-secondary"
                onClick={() => {
                  setSelectedInquiry(null)
                  setResponseMessage('')
                }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() => respondToInquiry(selectedInquiry)}
              >
                Send Response
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ArtistInquiries