import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Save, ArrowLeft, Eye, EyeOff, Trash2 } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

const ArtworkCreate = () => {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const batchTokenFromState = location.state?.batchToken
  const activeBatchInSession = sessionStorage.getItem('activeUploadBatch')

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingIds, setSavingIds] = useState({})
  const [errors, setErrors] = useState({})

  // Validation rules
  const validateField = useCallback((field, value, item) => {
    switch (field) {
      case 'title':
        if (!value || !value.trim()) return 'Title is required'
        if (value.trim().length < 2) return 'Title must be at least 2 characters'
        if (value.trim().length > 200) return 'Title must be less than 200 characters'
        return null
      case 'year':
        if (value && (isNaN(value) || value < 1000 || value > new Date().getFullYear())) {
          return 'Please enter a valid year'
        }
        return null
      case 'price':
        if (value && (isNaN(value) || Number(value) < 0)) {
          return 'Price must be a positive number'
        }
        return null
      case 'edition_number':
        if (value && item.edition_size) {
          const num = Number(value)
          const size = Number(item.edition_size)
          if (isNaN(num) || num < 1 || num > size) {
            return `Edition number must be between 1 and ${size}`
          }
        }
        return null
      case 'edition_size':
        if (value && (isNaN(value) || Number(value) < 1)) {
          return 'Edition size must be a positive number'
        }
        return null
      default:
        return null
    }
  }, [])

  useEffect(() => {
    if (!profile?.id || !user) {
      navigate('/dashboard/artworks')
      return
    }

    // Validate batch token
    if (!batchTokenFromState || !activeBatchInSession || batchTokenFromState !== activeBatchInSession) {
      toast.error('Invalid upload session. Please start a new upload.')
      navigate('/dashboard/artworks')
      return
    }

    fetchPendingArtworks()
  }, [profile?.id, user, batchTokenFromState, activeBatchInSession, navigate])

  useEffect(() => {
    // Cleanup session storage on unmount
    return () => {
      sessionStorage.removeItem('activeUploadBatch')
    }
  }, [])

  const fetchPendingArtworks = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .eq('artist_id', profile.id)
        .eq('status', 'pending')
        .eq('batch_id', batchTokenFromState)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      // Initialize with default values
      const processedItems = (data || []).map(item => ({
        ...item,
        title: item.title || 'Untitled',
        for_sale: item.for_sale || false,
        currency: item.currency || 'USD'
      }))
      
      setItems(processedItems)
    } catch (err) {
      console.error('Fetch pending artworks error:', err)
      toast.error('Failed to load artworks')
      navigate('/dashboard/artworks')
    } finally {
      setLoading(false)
    }
  }

  const handleFieldChange = (id, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value }
        
        // Handle special cases
        if (field === 'for_sale' && !value) {
          // Clear price when not for sale
          updatedItem.price = null
        }
        
        if (field === 'edition_size' && !value) {
          // Clear edition number when no edition size
          updatedItem.edition_number = null
        }
        
        return updatedItem
      }
      return item
    }))

    // Clear field-specific error
    setErrors(prev => ({
      ...prev,
      [`${id}_${field}`]: null
    }))
  }

  const validateItem = (item) => {
    const itemErrors = {}
    const fields = ['title', 'year', 'price', 'edition_number', 'edition_size']
    
    fields.forEach(field => {
      const error = validateField(field, item[field], item)
      if (error) {
        itemErrors[`${item.id}_${field}`] = error
      }
    })

    return itemErrors
  }

  const handleSave = async (id) => {
    const item = items.find(i => i.id === id)
    if (!item) return

    // Validate item
    const itemErrors = validateItem(item)
    if (Object.keys(itemErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...itemErrors }))
      toast.error('Please fix the errors before saving')
      return
    }

    setSavingIds(prev => ({ ...prev, [id]: true }))

    try {
      const updateData = {
        title: item.title.trim(),
        description: item.description?.trim() || null,
        medium: item.medium?.trim() || null,
        dimensions: item.dimensions?.trim() || null,
        year: item.year ? Number(item.year) : null,
        price: item.for_sale && item.price ? Number(item.price) : null,
        currency: item.currency || 'USD',
        edition_size: item.edition_size ? Number(item.edition_size) : null,
        edition_number: item.edition_number ? Number(item.edition_number) : null,
        for_sale: Boolean(item.for_sale),
        status: 'complete',
        updated_at: new Date().toISOString()
      }

      // Generate unique URL for the artwork
      if (profile.public_code) {
        const slug = item.title.trim().toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/--+/g, '-')
        updateData.unique_url = `/artist/${profile.public_code}/${slug}-${id.slice(-8)}`
      }

      const { error } = await supabase
        .from('artworks')
        .update(updateData)
        .eq('id', id)
        .eq('artist_id', profile.id) // Security check

      if (error) throw error

      // Update local state
      setItems(prev => prev.map(i => 
        i.id === id ? { ...i, ...updateData } : i
      ))

      toast.success('Artwork saved successfully!')
    } catch (err) {
      console.error('Save artwork error:', err)
      toast.error('Failed to save artwork. Please try again.')
    } finally {
      setSavingIds(prev => ({ ...prev, [id]: false }))
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this artwork? This action cannot be undone.')) {
      return
    }

    setSavingIds(prev => ({ ...prev, [id]: true }))

    try {
      const { error } = await supabase
        .from('artworks')
        .delete()
        .eq('id', id)
        .eq('artist_id', profile.id) // Security check

      if (error) throw error

      setItems(prev => prev.filter(i => i.id !== id))
      toast.success('Artwork deleted')
    } catch (err) {
      console.error('Delete artwork error:', err)
      toast.error('Failed to delete artwork')
    } finally {
      setSavingIds(prev => ({ ...prev, [id]: false }))
    }
  }

  const handleSaveAll = async () => {
    const pendingItems = items.filter(i => i.status === 'pending')
    
    if (pendingItems.length === 0) {
      toast.info('All artworks are already saved')
      return
    }

    // Validate all items first
    let hasErrors = false
    const allErrors = {}
    
    pendingItems.forEach(item => {
      const itemErrors = validateItem(item)
      if (Object.keys(itemErrors).length > 0) {
        Object.assign(allErrors, itemErrors)
        hasErrors = true
      }
    })

    if (hasErrors) {
      setErrors(allErrors)
      toast.error('Please fix all errors before saving')
      return
    }

    // Save all valid items
    setSavingIds(prev => {
      const newState = { ...prev }
      pendingItems.forEach(item => { newState[item.id] = true })
      return newState
    })

    try {
      await Promise.all(pendingItems.map(item => handleSave(item.id)))
      toast.success(`Successfully saved ${pendingItems.length} artworks!`)
    } catch (err) {
      console.error('Save all error:', err)
    } finally {
      setSavingIds({})
    }
  }

  const allComplete = useMemo(() => 
    items.length > 0 && items.every(i => i.status === 'complete'), 
    [items]
  )

  const pendingCount = useMemo(() => 
    items.filter(i => i.status === 'pending').length, 
    [items]
  )

  if (loading) {
    return <LoadingSpinner />
  }

  if (items.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Pending Artworks</h1>
          <p className="text-gray-600 mb-6">
            There are no pending artworks in this batch. They may have already been completed or deleted.
          </p>
          <button
            onClick={() => navigate('/dashboard/artworks')}
            className="btn-primary"
          >
            Back to Artworks
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard/artworks')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Artworks
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-3xl font-bold text-gray-900">Complete Your Uploads</h1>
          </div>
          
          {pendingCount > 0 && (
            <button
              onClick={handleSaveAll}
              disabled={Object.values(savingIds).some(Boolean)}
              className="btn-primary flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save All ({pendingCount})</span>
            </button>
          )}
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>
            {allComplete ? (
              <span className="text-green-600 font-medium">✓ All artworks completed</span>
            ) : (
              <span>{pendingCount} artwork{pendingCount !== 1 ? 's' : ''} pending completion</span>
            )}
          </span>
        </div>
      </div>

      {/* Artwork Items */}
      <div className="space-y-8">
        {items.map((item, index) => (
          <div key={item.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-medium text-gray-900">
                    Artwork {index + 1}
                  </span>
                  {item.status === 'complete' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <Eye className="h-3 w-3 mr-1" />
                      Complete
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <EyeOff className="h-3 w-3 mr-1" />
                      Pending
                    </span>
                  )}
                </div>
                
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={savingIds[item.id]}
                  className="text-red-600 hover:text-red-700 p-2"
                  title="Delete artwork"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Image Preview */}
                <div className="lg:col-span-1">
                  <img
                    src={item.image_url}
                    alt={item.title || 'Untitled'}
                    className="w-full h-64 object-cover rounded-lg bg-gray-100"
                  />
                </div>

                {/* Form Fields */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Title */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={item.title || ''}
                        onChange={(e) => handleFieldChange(item.id, 'title', e.target.value)}
                        className={`input w-full ${errors[`${item.id}_title`] ? 'border-red-500' : ''}`}
                        placeholder="Enter artwork title"
                      />
                      {errors[`${item.id}_title`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`${item.id}_title`]}</p>
                      )}
                    </div>

                    {/* Medium */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Medium
                      </label>
                      <input
                        type="text"
                        value={item.medium || ''}
                        onChange={(e) => handleFieldChange(item.id, 'medium', e.target.value)}
                        className="input w-full"
                        placeholder="e.g., Oil on canvas"
                      />
                    </div>

                    {/* Year */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Year
                      </label>
                      <input
                        type="number"
                        value={item.year || ''}
                        onChange={(e) => handleFieldChange(item.id, 'year', e.target.value)}
                        className={`input w-full ${errors[`${item.id}_year`] ? 'border-red-500' : ''}`}
                        placeholder={new Date().getFullYear()}
                        min="1000"
                        max={new Date().getFullYear()}
                      />
                      {errors[`${item.id}_year`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`${item.id}_year`]}</p>
                      )}
                    </div>

                    {/* Dimensions */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dimensions
                      </label>
                      <input
                        type="text"
                        value={item.dimensions || ''}
                        onChange={(e) => handleFieldChange(item.id, 'dimensions', e.target.value)}
                        className="input w-full"
                        placeholder="e.g., 24 x 36 inches"
                      />
                    </div>

                    {/* For Sale Checkbox */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`for_sale_${item.id}`}
                        checked={item.for_sale || false}
                        onChange={(e) => handleFieldChange(item.id, 'for_sale', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`for_sale_${item.id}`} className="text-sm font-medium text-gray-700">
                        Available for sale
                      </label>
                    </div>

                    {/* Price (only show if for sale) */}
                    {item.for_sale && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Price
                        </label>
                        <div className="flex">
                          <select
                            value={item.currency || 'USD'}
                            onChange={(e) => handleFieldChange(item.id, 'currency', e.target.value)}
                            className="input rounded-r-none border-r-0 w-20"
                          >
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                            <option value="ZAR">ZAR</option>
                          </select>
                          <input
                            type="number"
                            value={item.price || ''}
                            onChange={(e) => handleFieldChange(item.id, 'price', e.target.value)}
                            className={`input rounded-l-none flex-1 ${errors[`${item.id}_price`] ? 'border-red-500' : ''}`}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        {errors[`${item.id}_price`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`${item.id}_price`]}</p>
                        )}
                      </div>
                    )}

                    {/* Edition Size */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Edition Size
                      </label>
                      <input
                        type="number"
                        value={item.edition_size || ''}
                        onChange={(e) => handleFieldChange(item.id, 'edition_size', e.target.value)}
                        className={`input w-full ${errors[`${item.id}_edition_size`] ? 'border-red-500' : ''}`}
                        placeholder="e.g., 50"
                        min="1"
                      />
                      {errors[`${item.id}_edition_size`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`${item.id}_edition_size`]}</p>
                      )}
                    </div>

                    {/* Edition Number (only show if edition size is set) */}
                    {item.edition_size && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Edition Number
                        </label>
                        <input
                          type="number"
                          value={item.edition_number || ''}
                          onChange={(e) => handleFieldChange(item.id, 'edition_number', e.target.value)}
                          className={`input w-full ${errors[`${item.id}_edition_number`] ? 'border-red-500' : ''}`}
                          placeholder="e.g., 1"
                          min="1"
                          max={item.edition_size}
                        />
                        {errors[`${item.id}_edition_number`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`${item.id}_edition_number`]}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={item.description || ''}
                      onChange={(e) => handleFieldChange(item.id, 'description', e.target.value)}
                      className="input w-full"
                      rows="3"
                      placeholder="Describe your artwork (optional)"
                    />
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-4">
                    <button
                      onClick={() => handleSave(item.id)}
                      disabled={savingIds[item.id] || item.status === 'complete'}
                      className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingIds[item.id] ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Saving...</span>
                        </>
                      ) : item.status === 'complete' ? (
                        <>
                          <Eye className="h-4 w-4" />
                          <span>Saved</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Save Artwork</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Completion Message */}
      {allComplete && (
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-green-900 mb-2">
            🎉 All artworks completed successfully!
          </h2>
          <p className="text-green-700 mb-4">
            Your {items.length} artwork{items.length !== 1 ? 's have' : ' has'} been saved and {items.length !== 1 ? 'are' : 'is'} now visible in your portfolio.
          </p>
          <button
            onClick={() => navigate('/dashboard/artworks')}
            className="btn-primary"
          >
            View All Artworks
          </button>
        </div>
      )}
    </div>
  )
}

export default ArtworkCreate
