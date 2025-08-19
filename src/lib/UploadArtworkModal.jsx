import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const UploadArtworkModal = ({ isOpen, onClose, profile }) => {
  const navigate = useNavigate()
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({}) // { filename: percent }

  if (!isOpen) return null

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files)
    setFiles(prev => [...prev, ...selectedFiles])
  }

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (!files.length) return toast.error('No files selected')
    setUploading(true)
    const uploadedUrls = []

    for (const file of files) {
      const fileName = `${profile.id}/${Date.now()}_${file.name}`

      const { data, error } = await supabase.storage
        .from('artworks')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        toast.error(`Failed to upload ${file.name}`)
        console.error(error)
      } else {
        const { publicUrl, error: urlError } = supabase.storage
          .from('artworks')
          .getPublicUrl(fileName)
        if (urlError) console.error(urlError)
        uploadedUrls.push(publicUrl)
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }))
      }
    }

    setUploading(false)
    toast.success('Files uploaded!')

    if (uploadedUrls.length > 0) {
      navigate('/dashboard/artworks/create', { state: { images: uploadedUrls } })
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">Upload Artwork</h2>
        <input type="file" multiple onChange={handleFileSelect} className="mb-4" />

        {files.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
            {files.map((file, idx) => (
              <div key={idx} className="flex justify-between items-center bg-gray-100 p-2 rounded">
                <span className="truncate">{file.name}</span>
                <div className="flex items-center gap-2">
                  {uploadProgress[file.name] && (
                    <span className="text-sm text-green-600">{uploadProgress[file.name]}%</span>
                  )}
                  <button onClick={() => handleRemoveFile(idx)} className="text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleUpload} className="btn-primary" disabled={uploading}>
            {uploading ? 'Uploading...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UploadArtworkModal
