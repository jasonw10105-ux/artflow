import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const SetPassword = () => {
  const { user, completeSignUp } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if user not in session
  useEffect(() => {
    if (!user) {
      toast.error('No active session. Please request a new magic link.')
      navigate('/register', { replace: true })
    }
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await completeSignUp(password)
      toast.success('Password set! Redirecting...')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      console.error(error)
      toast.error(error.message || 'Failed to set password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Set Your Password</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            className="w-full border px-3 py-2 rounded-lg"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Setting...' : 'Set Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default SetPassword
