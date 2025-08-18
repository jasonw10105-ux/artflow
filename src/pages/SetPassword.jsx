// src/pages/SetPassword.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

const SetPassword = () => {
  const { user, loading: authLoading, profile, completeSignUp } = useAuth()
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

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        toast.error('No active session. Please register or login.')
        navigate('/register')
      }
      if (profile?.password_set) {
        toast('Password already set. Please login.')
        navigate('/login')
      }
    }
  }, [authLoading, user, profile, navigate])

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))

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
      await completeSignUp(formData.password, formData.userType, formData.bio, formData.name)
      toast.success('Account setup complete!')
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to complete setup')
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <h2 className="mt-6 text-3xl font-bold text-gray-900 text-center">Set Your Password</h2>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Account Type, Name, Bio, Password, Confirm Password */}
          {/* Similar to previous implementation */}
        </form>
      </div>
    </div>
  )
}

export default SetPassword
