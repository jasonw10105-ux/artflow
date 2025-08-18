// src/pages/VerifyOtp.jsx
import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const VerifyOtp = () => {
  const { state } = useLocation()
  const { email } = state || {}
  const { verifyOtp } = useAuth()
  const navigate = useNavigate()
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)

  if (!email) {
    navigate('/login')
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await verifyOtp(email, otp)
      toast.success('OTP verified successfully!')

      // Check if user has set password
      navigate('/set-password')
    } catch (err) {
      console.error('OTP verification failed:', err)
      toast.error(err.message || 'Failed to verify OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <h2 className="text-center text-3xl font-bold text-gray-900">Enter OTP</h2>
        <p className="text-center text-gray-600">We sent a login link to <strong>{email}</strong></p>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700">OTP</label>
            <input
              id="otp"
              name="otp"
              type="text"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="input mt-1"
              placeholder="Enter OTP"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default VerifyOtp
