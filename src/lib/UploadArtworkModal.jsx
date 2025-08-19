const UploadArtworkModal = ({ isOpen, onClose, profile, onUploadComplete }) => {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})

  if (!isOpen) return null

  const handleUpload = async () => {
    if (!files.length) return toast.error('No files selected')
    setUploading(true)

    const uploadedIds = []

    for (const file of files) {
      const fileName = `${profile.id}/${Date.now()}_${file.name}`
      try {
        const { error: uploadError } = await supabase.storage.from('artworks').upload(fileName, file)
        if (uploadError) throw uploadError

        const { publicUrl } = supabase.storage.from('artworks').getPublicUrl(fileName)

        const { data, error: insertError } = await supabase
          .from('artworks')
          .insert([{ artist_id: profile.id, image_url: publicUrl, status: 'pending', title: 'Untitled' }])
          .select('id') // return the new row ID

        if (insertError) throw insertError

        uploadedIds.push(data[0].id) // store new artwork ID
        setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }))
      } catch (err) {
        console.error(err)
        toast.error(`Failed to upload ${file.name}`)
        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }))
      }
    }

    setUploading(false)
    if (uploadedIds.length) {
      toast.success('Files uploaded! Pending artworks created.')
      onUploadComplete?.(uploadedIds) // pass IDs to parent
    }

    setFiles([])
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-lg relative">
        <h2 className="text-xl font-bold mb-4">Upload Artwork</h2>
        <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files))} className="mb-4" />

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
                  <button onClick={() => setFiles(files.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-700">
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleUpload} disabled={uploading || files.length === 0} className="btn-primary">
            {uploading ? 'Uploading...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UploadArtworkModal
