import React, { useState, useEffect } from 'react'
// ...other imports remain the same

const AVAILABLE_TAGS = [
  'Painter', 'Sculptor', 'Digital Artist', 'Photographer',
  'Illustrator', 'Mixed Media', 'Street Artist', 'Concept Artist',
  'Ceramicist', 'Textile Artist', 'Calligrapher', 'Graphic Designer'
]

const Settings = () => {
  const { profile, updateProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [profileData, setProfileData] = useState({
    name: '',
    bio: '',
    email: '',
    tags: [],
    certificatePreference: 'digital'
  })
  const [tagSearch, setTagSearch] = useState('') // new state for search input
  const [filteredTags, setFilteredTags] = useState(AVAILABLE_TAGS)

  useEffect(() => {
    if (profile) {
      setProfileData({
        name: profile.name || '',
        bio: profile.bio || '',
        email: profile.email || '',
        tags: profile.tags || [],
        certificatePreference: profile.certificatePreference || 'digital'
      })
      setFilteredTags(AVAILABLE_TAGS)
      fetchAnalytics()
    }
  }, [profile])

  // Filter tags based on search input
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ...Tabs code remains unchanged */}

      {activeTab === 'profile' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>
            
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              {/* Name, Email, Bio inputs unchanged */}

              {/* Searchable Tags Multi-Select */}
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
                <p className="mt-1 text-sm text-gray-500">
                  Select tags that best describe your artistic style.
                </p>
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

      {/* Preferences Tab unchanged */}
    </div>
  )
}

export default Settings
