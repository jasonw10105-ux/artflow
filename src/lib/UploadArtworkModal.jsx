import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const UploadArtworkModal = ({ isOpen, onClose, profile }) => {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const navigate = useNavigate()

  if (!isOpen) return null

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files)
    setFiles((prev) => [...prev, ...selected])
  }

  const handleRemoveFile = (index) => {
    const removedFile = files[index]
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setUploadProgress((prev) => {
      const updated = { ...prev }
      delete updated[removedFile.name]
      return updated
    })
  }

  const handleUpload = async () => {
    if (!files.length) return toast.error('No files selected')
    setUploading(true)

    const successfulUploads = []

    for (const file of files) {
      const fileName = `${profile.id}/${Date.now()}_${file.name}`
      try {
        // Upload to Supabase Storage
        const { error } = await supabase.storage.from('artworks').upload(fileName, file)
        if (error) throw error

        const { publicUrl } = supabase.storage.from('artworks').getPublicUrl(fileName)

        // Create pending artwork record with default title
        const { data, error: insertError } = await supabase
          .from('artworks')
          .insert([
            { artist_id: profile.id, image_url: publicUrl, status: 'pending', title: 'Untitled' }
          ])
          .select('id')
        if (insertError) throw insertError

        successfulUploads.push(data[0].id)
        setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }))
      } catch (err) {
        console.error(err)
        toast.error(`Failed to upload ${file.name}`)
        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }))
      }
    }

    setUploading(false)

    if (successfulUploads.length > 0) {
      toast.success('Files uploaded! Pending artworks created.')
      setFiles([])
      onClose()
      navigate('/dashboard/artworks/create', { state: { uploadedArtworkIds: successfulUploads } })
    } else {
      toast.error('No files were uploaded successfully.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-lg relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800">
          <X />
        </button>
        <h2 className="text-xl font-bold mb-4">Upload Artwork</h2>
        <input type="file" multiple onChange={handleFileSelect} className="mb-4" />

        {files.length > 0 && (
          <div className="max-h-64 overflow-y-auto mb-4">
            {files.map((file, index) => (
              <div key={index} className="flex justify-between items-center mb-2">
                <span className="truncate">{file.name}</span>
                {uploading && uploadProgress[file.name] != null ? (
                  <div className="w-32 h-2 bg-gray-200 rounded">
                    <div
                      className="h-2 bg-blue-500 rounded"
                      style={{ width: `${uploadProgress[file.name]}%` }}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="btn-primary"
          >
            {uploading ? 'Uploading...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UploadArtworkModal
