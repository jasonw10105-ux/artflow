import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const Register = () => {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitted) return // prevent multiple submissions
    setLoading(true)

    try {
      await signUp(email)
      toast.success('Check your email for the magic link!')
      setSubmitted(true)       // mark as submitted
    } catch (error) {
      console.error('Registration error:', error.message)
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

  const handleEmailChange = (e) => {
    setEmail(e.target.value)
    if (submitted) setSubmitted(false) // allow re-submission if email changes
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
              onChange={handleEmailChange}
              className="input mt-1"
              placeholder="you@example.com"
              disabled={submitted} // disable input after submission
            />
          </div>

          <button
            type="submit"
            disabled={loading || submitted} // disable submit after sending link
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : submitted ? 'Magic Link Sent' : 'Register'}
          </button>
        </form>

        {submitted && (
          <p className="mt-4 text-sm text-green-600 text-center">
            We’ve sent a magic link to <strong>{email}</strong>. Check your inbox to continue.
          </p>
        )}
      </div>
    </div>
  )
}

export default Register
