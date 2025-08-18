// src/pages/CatalogueManagement.jsx
import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Plus, Trash2, Share2 } from 'lucide-react'

const CatalogueManagement = () => {
  const { profile } = useAuth()
  const [catalogues, setCatalogues] = useState([])
  const [artworks, setArtworks] = useState([])
  const [selectedCatalogue, setSelectedCatalogue] = useState(null)
  const [selectedArtworks, setSelectedArtworks] = useState([])
  const [selectedContacts, setSelectedContacts] = useState([])
  const [step, setStep] = useState(1)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      fetchCatalogues()
      fetchArtworks()
      fetchContacts()
    }
  }, [profile])

  // ===============================
  // Fetch Functions
  // ===============================
  const fetchCatalogues = async () => {
    try {
      const { data, error } = await supabase
        .from('catalogues')
        .select('*')
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCatalogues(data)
    } catch (err) {
      console.error('Error fetching catalogues:', err)
      toast.error('Failed to load catalogues')
    }
  }

  const fetchArtworks = async () => {
    try {
      const { data, error } = await supabase
        .from('artworks')
        .select('id,title,image_url')
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setArtworks(data)
    } catch (err) {
      console.error('Error fetching artworks:', err)
      toast.error('Failed to load artworks')
    }
  }

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('artist_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSelectedContacts([]) // reset selection
      setLoading(false)
    } catch (err) {
      console.error('Error fetching contacts:', err)
      toast.error('Failed to load contacts')
      setLoading(false)
    }
  }

  // ===============================
  // Handlers
  // ===============================
  const toggleArtwork = (artworkId) => {
    setSelectedArtworks(prev =>
      prev.includes(artworkId)
        ? prev.filter(id => id !== artworkId)
        : [...prev, artworkId]
    )
  }

  const toggleContact = (contactId) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }

  const saveCatalogue = async () => {
    if (!title) return toast.error('Catalogue title is required')
    if (selectedArtworks.length === 0) return toast.error('Select at least one artwork')

    try {
      // Insert catalogue
      const { data: newCatalogue, error: insertError } = await supabase
        .from('catalogues')
        .insert({
          artist_id: profile.id,
          title,
          description,
          is_public: isPublic,
          password: password || null
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Link artworks to catalogue
      const links = selectedArtworks.map((artwork_id, index) => ({
        catalogue_id: newCatalogue.id,
        artwork_id,
        position: index
      }))

      const { error: linkError } = await supabase
        .from('catalogue_artworks')
        .insert(links)

      if (linkError) throw linkError

      toast.success('Catalogue saved!')
      setTitle('')
      setDescription('')
      setSelectedArtworks([])
      setSelectedContacts([])
      setStep(1)
      fetchCatalogues()
    } catch (err) {
      console.error('Error saving catalogue:', err)
      toast.error('Failed to save catalogue')
    }
  }

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>

  // ===============================
  // UI
  // ===============================
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Catalogues</h1>

      {/* Step navigation */}
      <div className="flex space-x-4 mb-6">
        <button
          className={`px-4 py-2 rounded ${step === 1 ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setStep(1)}
        >
          1. Details
        </button>
        <button
          className={`px-4 py-2 rounded ${step === 2 ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setStep(2)}
        >
          2. Select Artworks
        </button>
        <button
          className={`px-4 py-2 rounded ${step === 3 ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setStep(3)}
        >
          3. Schedule Send
        </button>
      </div>

      {/* Step 1: Details */}
      {step === 1 && (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Catalogue title"
            className="input w-full"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <textarea
            placeholder="Description (optional)"
            className="input w-full"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={() => setIsPublic(!isPublic)}
              />
              <span>Public</span>
            </label>
            {!isPublic && (
              <input
                type="text"
                placeholder="Password"
                className="input"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            )}
          </div>
        </div>
      )}

      {/* Step 2: Select Artworks */}
      {step === 2 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {artworks.map(art => (
            <div
              key={art.id}
              className={`border rounded p-2 cursor-pointer flex flex-col items-center ${
                selectedArtworks.includes(art.id) ? 'border-primary-600' : 'border-gray-300'
              }`}
              onClick={() => toggleArtwork(art.id)}
            >
              <img src={art.image_url} alt={art.title} className="w-full h-40 object-cover mb-2" />
              <p className="text-center font-medium">{art.title}</p>
            </div>
          ))}
        </div>
      )}

      {/* Step 3: Schedule Send */}
      {step === 3 && (
        <div>
          <p className="mb-2 font-medium">Select contacts to send this catalogue to:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map(contact => (
              <label
                key={contact.id}
                className="flex items-center space-x-2 p-2 border rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedContacts.includes(contact.id)}
                  onChange={() => toggleContact(contact.id)}
                />
                <div>
                  <p className="font-medium">{contact.name || '-'}</p>
                  <p className="text-sm text-gray-500">{contact.email}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Save button */}
      <div className="mt-6">
        <button
          className="btn-primary"
          onClick={saveCatalogue}
        >
          <Share2 className="inline mr-2 h-4 w-4" /> Save & Share
        </button>
      </div>

      {/* Existing catalogues */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Your Catalogues</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {catalogues.map(cat => (
            <div key={cat.id} className="p-4 border rounded flex justify-between items-center">
              <div>
                <p className="font-medium">{cat.title}</p>
                <p className="text-sm text-gray-500">{cat.description}</p>
              </div>
              <button
                onClick={() => setSelectedCatalogue(cat)}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CatalogueManagement
