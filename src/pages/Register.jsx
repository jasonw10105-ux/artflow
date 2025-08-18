import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const Register = () => {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Attempt to sign up
      await signUp(email)
      toast.success(`Magic link sent! Check your email to set up your account.`)
      setEmail('')
    } catch (error) {
      console.error('Registration error:', error)

      // Email already exists → redirect to login
      if (error.message.includes('already exists')) {
        toast.error('Email already registered. Redirecting to login...')
        setTimeout(() => navigate('/login'), 2000)
      } else {
        toast.error(error.message || 'Registration failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <h2 className="mt-6 text-3xl font-bold text-gray-900 text-center">
          Create an account
        </h2>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Register'}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-600 text-center">
          After registering, you will receive a magic link via email to set up your password.
        </p>
      </div>
    </div>
  )
}

export default Register
