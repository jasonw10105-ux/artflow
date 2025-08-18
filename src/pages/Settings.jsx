import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Save } from 'lucide-react'

const AVAILABLE_TAGS = [
  'Painter', 'Sculptor', 'Digital Artist', 'Photographer',
  'Illustrator', 'Mixed Media', 'Street Artist', 'Concept Artist',
  'Ceramicist', 'Textile Artist', 'Calligrapher', 'Graphic Designer'
]

const Settings = () => {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [profileData, setProfileData] = useState({
    name: '',
    bio: '',
    shortBio: '',
    email: '',
    tags: [],
    certificatePreference: 'digital',
    headshotUrl: ''
  })
  const [tagSearch, setTagSearch] = useState('')
  const [filteredTags, setFilteredTags] = useState(AVAILABLE_TAGS)

  // Fetch profile from Supabase
  useEffect(() => {
    const fetchProfile = async () => {
      if (!profile?.id) return
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single()
      
      if (error) {
        console.error('Error fetching profile:', error)
        return
      }

      setProfileData({
        name: data.name || '',
        bio: data.bio || '',
        shortBio: data.shortBio || (data.bio ? data.bio.slice(0, 200) : ''),
        email: data.email || '',
        tags: data.tags || [],
        certificatePreference: data.certificatePreference || 'digital',
        headshotUrl: data.headshotUrl || ''
      })
    }

    fetchProfile()
    setFilteredTags(AVAILABLE_TAGS)
  }, [profile])

  // Filter tags
  useEffect(() => {
    const filtered = AVAILABLE_TAGS.filter(tag =>
      tag.toLowerCase().includes(tagSearch.toLowerCase())
    )
    setFilteredTags(filtered)
  }, [tagSearch])

  const handleTagToggle = (tag) => {
    setProfileData(prev => {
      const tags = prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
      return { ...prev, tags }
    })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const fileName = `${profile.id}-${Date.now()}-${file.name}`
    const { data, error: uploadError } = await supabase.storage
      .from('profile-headshots')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      toast.error('Failed to upload image')
      console.error(uploadError)
      return
    }

    const { data: urlData } = supabase.storage
      .from('profile-headshots')
      .getPublicUrl(fileName)

    setProfileData(prev => ({ ...prev, headshotUrl: urlData.publicUrl }))
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert([{
          id: profile.id,
          name: profileData.name,
          bio: profileData.bio,
          shortBio: profileData.shortBio,
          tags: profileData.tags,
          certificatePreference: profileData.certificatePreference,
          headshotUrl: profileData.headshotUrl
        }])
      if (error) throw error
      toast.success('Profile updated successfully!')
    } catch (err) {
      toast.error('Failed to update profile.')
      console.error(err)
    }
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {activeTab === 'profile' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>
            <form onSubmit={handleProfileUpdate} className="space-y-6">

              {/* Headshot */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profile Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="input mb-2"
                />
                {profileData.headshotUrl && (
                  <img
                    src={profileData.headshotUrl}
                    alt="Profile"
                    className="h-24 w-24 rounded-full object-cover mt-2"
                  />
                )}
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={profileData.name}
                  onChange={handleInputChange}
                  className="input w-full"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={profileData.bio}
                  onChange={handleInputChange}
                  className="input w-full h-24"
                />
              </div>

              {/* Short Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Short Bio (first 200 characters)
                </label>
                <textarea
                  name="shortBio"
                  value={profileData.shortBio}
                  onChange={handleInputChange}
                  className="input w-full h-16"
                  maxLength={200}
                />
                <p className="text-gray-500 text-sm">{profileData.shortBio.length}/200</p>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  placeholder="Search tags..."
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  className="input mb-2"
                />
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto border rounded p-2">
                  {filteredTags.map(tag => {
                    const selected = profileData.tags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        className={`px-3 py-1 rounded-full border text-sm ${
                          selected
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-gray-100 text-gray-700 border-gray-300'
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                  {filteredTags.length === 0 && (
                    <p className="text-gray-500 text-sm">No tags found.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
