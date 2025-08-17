import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  Download, 
  MessageSquare, 
  Eye, 
  Calendar,
  Palette,
  DollarSign,
  User,
  ArrowLeft
} from 'lucide-react'
import jsPDF from 'jspdf'
import toast from 'react-hot-toast'

const PublicCatalogue = () => {
  const { catalogueId } = useParams()
  const { user } = useAuth()
  const [catalogue, setCatalogue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [inquiryModal, setInquiryModal] = useState(false)
  const [selectedArtwork, setSelectedArtwork] = useState(null)
  const [inquiryForm, setInquiryForm] = useState({
    name: '',
    email: '',
    message: ''
  })
  const [generatingPDF, setGeneratingPDF] = useState(false)

  useEffect(() => {
    fetchCatalogue()
    // Track view
    trackCatalogueView()
  }, [catalogueId])

  const fetchCatalogue = async () => {
    try {
      const { data, error } = await supabase
        .from('catalogues')
        .select(`
          *,
          profiles(name, bio, email),
          catalogue_artworks(
            artworks(*)
          )
        `)
        .eq('id', catalogueId)
        .eq('is_public', true)
        .single()

      if (error) throw error
      setCatalogue(data)
    } catch (error) {
      console.error('Error fetching catalogue:', error)
      toast.error('Catalogue not found or not accessible')
    } finally {
      setLoading(false)
    }
  }

  const trackCatalogueView = async () => {
    try {
      // Simple view tracking - in a real app you'd want to prevent duplicate views
      await supabase
        .from('catalogue_views')
        .insert([{
          catalogue_id: catalogueId,
          viewer_ip: 'anonymous', // You'd get real IP in production
          viewed_at: new Date().toISOString()
        }])
    } catch (error) {
      // Silent fail for view tracking
      console.log('View tracking failed:', error)
    }
  }

  const handleInquirySubmit = async (e) => {
    e.preventDefault()
    
    if (!user) {
      toast.error('Please sign up or log in to send inquiries')
      return
    }

    try {
      const { error } = await supabase
        .from('inquiries')
        .insert([{
          artist_id: catalogue.artist_id,
          artwork_id: selectedArtwork?.id,
          collector_id: user.id,
          message: inquiryForm.message,
          contact_email: inquiryForm.email || user.email
        }])

      if (error) throw error

      toast.success('Inquiry sent successfully!')
      setInquiryModal(false)
      setSelectedArtwork(null)
      setInquiryForm({ name: '', email: '', message: '' })
    } catch (error) {
      console.error('Error sending inquiry:', error)
      toast.error('Failed to send inquiry')
    }
  }

  const generatePDF = async () => {
    setGeneratingPDF(true)
    try {
      const pdf = new jsPDF()
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      
      // Title page
      pdf.setFontSize(24)
      pdf.text(catalogue.title, pageWidth / 2, 40, { align: 'center' })
      
      pdf.setFontSize(14)
      pdf.text(`By ${catalogue.profiles.name}`, pageWidth / 2, 60, { align: 'center' })
      
      if (catalogue.description) {
        pdf.setFontSize(12)
        const descriptionLines = pdf.splitTextToSize(catalogue.description, pageWidth - 40)
        pdf.text(descriptionLines, 20, 100)
      }

      // Add artworks
      const artworks = catalogue.catalogue_artworks?.map(ca => ca.artworks) || []
      
      for (let i = 0; i < artworks.length; i++) {
        const artwork = artworks[i]
        
        if (i > 0) {
          pdf.addPage()
        } else {
          pdf.addPage()
        }
        
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            img.src = artwork.image_url
          })
          
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          const maxWidth = pageWidth - 40
          const maxHeight = pageHeight - 120
          
          let { width, height } = img
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width *= ratio
          height *= ratio
          
          canvas.width = width
          canvas.height = height
          ctx.drawImage(img, 0, 0, width, height)
          
          const imgData = canvas.toDataURL('image/jpeg', 0.8)
          pdf.addImage(imgData, 'JPEG', (pageWidth - width) / 2, 20, width, height)
          
          // Add artwork details
          const detailsY = 20 + height + 20
          pdf.setFontSize(16)
          pdf.text(artwork.title, 20, detailsY)
          
          pdf.setFontSize(12)
          let currentY = detailsY + 15
          
          if (artwork.medium) {
            pdf.text(`Medium: ${artwork.medium}`, 20, currentY)
            currentY += 15
          }
          
          if (artwork.dimensions) {
            pdf.text(`Dimensions: ${artwork.dimensions}`, 20, currentY)
            currentY += 15
          }
          
          if (artwork.year) {
            pdf.text(`Year: ${artwork.year}`, 20, currentY)
            currentY += 15
          }
          
        } catch (imgError) {
          console.error('Error loading image for PDF:', imgError)
          pdf.setFontSize(16)
          pdf.text(artwork.title, 20, 40)
          pdf.setFontSize(12)
          pdf.text('Image could not be loaded', 20, 60)
        }
      }
      
      pdf.save(`${catalogue.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`)
      toast.success('PDF downloaded successfully')
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF')
    } finally {
      setGeneratingPDF(false)
    }
  }

  const openInquiryModal = (artwork = null) => {
    setSelectedArtwork(artwork)
    setInquiryForm({
      name: user?.user_metadata?.name || '',
      email: user?.email || '',
      message: artwork ? `I'm interested in "${artwork.title}". Could you provide more information?` : `I'm interested in your work. Could you provide more information?`
    })
    setInquiryModal(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!catalogue) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Catalogue Not Found</h1>
          <p className="text-gray-600 mb-6">This catalogue may be private or no longer available.</p>
          <Link to="/" className="btn-primary">
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  const artworks = catalogue.catalogue_artworks?.map(ca => ca.artworks) || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Home
            </Link>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={generatePDF}
                disabled={generatingPDF}
                className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                <span>{generatingPDF ? 'Generating...' : 'Download PDF'}</span>
              </button>
              
              <button
                onClick={() => openInquiryModal()}
                className="btn-primary flex items-center space-x-2"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Contact Artist</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Catalogue Info */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{catalogue.title}</h1>
              {catalogue.description && (
                <p className="text-gray-600 mb-6">{catalogue.description}</p>
              )}
              
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <Palette className="h-4 w-4 mr-1" />
                  <span>{artworks.length} artworks</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>{new Date(catalogue.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <User className="h-8 w-8 text-gray-400 mr-3" />
                <div>
                  <h3 className="font-semibold text-gray-900">{catalogue.profiles.name}</h3>
                  <p className="text-sm text-gray-600">Artist</p>
                </div>
              </div>
              
              {catalogue.profiles.bio && (
                <p className="text-sm text-gray-600 mb-4">{catalogue.profiles.bio}</p>
              )}
              
              <Link
                to={`/artist/${catalogue.artist_id}`}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                View Artist Profile →
              </Link>
            </div>
          </div>
        </div>

        {/* Artworks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {artworks.map((artwork) => (
            <div key={artwork.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative">
                <img
                  src={artwork.image_url}
                  alt={artwork.title}
                  className="w-full h-64 object-cover"
                />
                {artwork.for_sale && (
                  <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                    For Sale
                  </div>
                )}
              </div>
              
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{artwork.title}</h3>
                
                <div className="space-y-1 text-sm text-gray-600 mb-4">
                  {artwork.medium && <p>Medium: {artwork.medium}</p>}
                  {artwork.dimensions && <p>Dimensions: {artwork.dimensions}</p>}
                  {artwork.year && <p>Year: {artwork.year}</p>}
                  
                  {artwork.edition_size && (
                    <p>Edition: {artwork.edition_number || '?'}/{artwork.edition_size}</p>
                  )}
                </div>
                
                {artwork.description && (
                  <p className="text-sm text-gray-700 mb-4">{artwork.description}</p>
                )}
                
                <div className="flex justify-between items-center">
                  {artwork.price && (
                    <div className="text-lg font-semibold text-green-600">
                      {artwork.currency} {artwork.price}
                    </div>
                  )}
                  
                  <button
                    onClick={() => openInquiryModal(artwork)}
                    className="btn-primary text-sm flex items-center space-x-1"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Inquire</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inquiry Modal */}
      {inquiryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold">
                {selectedArtwork ? `Inquire about "${selectedArtwork.title}"` : 'Contact Artist'}
              </h3>
              <button
                onClick={() => setInquiryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleInquirySubmit} className="p-6 space-y-4">
              {!user && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    Please <Link to="/login" className="font-medium underline">sign in</Link> or{' '}
                    <Link to="/register" className="font-medium underline">create an account</Link> to send inquiries.
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Email
                </label>
                <input
                  type="email"
                  value={inquiryForm.email}
                  onChange={(e) => setInquiryForm(prev => ({ ...prev, email: e.target.value }))}
                  className="input"
                  required
                  disabled={!user}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={inquiryForm.message}
                  onChange={(e) => setInquiryForm(prev => ({ ...prev, message: e.target.value }))}
                  className="input"
                  rows="4"
                  required
                  disabled={!user}
                  placeholder="Your message to the artist..."
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setInquiryModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!user}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send Inquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PublicCatalogue