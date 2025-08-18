import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const SetPassword = () => {
  const { user, completeSignUp } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('artist')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(false)

  // redirect if not logged in via Supabase OTP
  useEffect(() => {
    if (!user) {
      navigate('/register')
    }
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password) return

    setLoading(true)
    try {
      await completeSignUp(password, role, bio)
      navigate('/dashboard')
    } catch (error) {
      console.error(error)
      alert('Failed to set up your account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Finish setting up your account
        </h2>
        <p className="text-center text-sm text-gray-600 mb-6">
          Signed in as <span className="font-medium">{user.email}</span>
        </p>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Choose a password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input mt-1 w-full"
              placeholder="Enter your password"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="input mt-1 w-full"
            >
              <option value="artist">Artist</option>
              <option value="collector">Collector</option>
            </select>
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
              Bio (optional)
            </label>
            <textarea
              id="bio"
              rows="3"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="input mt-1 w-full"
              placeholder="Tell us a bit about yourself"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting up...' : 'Finish Setup'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default SetPassword
