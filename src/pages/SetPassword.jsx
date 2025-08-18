import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

const SetPassword = () => {
  const { user, completeSignUp, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    name: '',
    bio: '',
    userType: 'artist'
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')

  // Pre-fill email once session is ready
  useEffect(() => {
    if (!authLoading && user) {
      setEmail(user.email)
    } else if (!authLoading && !user) {
      toast.error('No active session found. Please request a new link.')
      navigate('/register')
    }
  }, [authLoading, user, navigate])

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      await completeSignUp({
        password: formData.password,
        userType: formData.userType,
        bio: formData.bio,
        name: formData.name
      })
      toast.success('Account setup complete!')
      navigate('/dashboard')
    } catch (error) {
      console.error('Error completing sign up:', error)
      toast.error(error.message || 'Failed to complete setup')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <h2 className="mt-6 text-3xl font-bold text-gray-900 text-center">Set your password</h2>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Account Type */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Account Type</label>
              <select
                name="userType"
                value={formData.userType}
                onChange={handleChange}
                className="input mt-1"
              >
                <option value="artist">Artist</option>
                <option value="collector">Collector</option>
              </select>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="input mt-1"
                placeholder="Enter your full name"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Bio {formData.userType === 'collector' ? '(Optional)' : ''}
              </label>
              <textarea
                name="bio"
                rows={3}
                value={formData.bio}
                onChange={handleChange}
                className="input mt-1"
                placeholder={
                  formData.userType === 'artist'
                    ? 'Tell us about your artistic style and background...'
                    : 'Tell us about your collecting interests...'
                }
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1 relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="input pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
              <div className="mt-1 relative">
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input pr-10"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default SetPassword
