import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

const Register = () => {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Check if the user already exists in Supabase Auth
      const { data: existingUser, error } = await supabase.auth.admin.getUserByEmail(email)
      if (error && error.message !== 'User not found') throw error

      if (existingUser?.user) {
        toast('This email is already registered. Please log in or reset your password.')
        navigate('/login')
        return
      }

      // User doesn't exist → send magic link
      await signUp(email)
      toast.success('Check your email to verify. Then set your password.')
      navigate('/set-password')
    } catch (err) {
      console.error('Registration error:', err)
      toast.error(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <h2 className="text-center text-3xl font-bold text-gray-900">Create an account</h2>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input mt-1"
              placeholder="you@example.com"
            />
          </div>

          <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Submitting...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Register
