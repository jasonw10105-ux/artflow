// src/pages/AuthCallback.jsx
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const AuthCallback = () => {
  const navigate = useNavigate()
  const { fetchProfile } = useAuth()

  useEffect(() => {
    const handleAuth = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error || !data.session) {
        toast.error('Login failed. Please try again.')
        navigate('/login')
        return
      }

      const user = data.session.user
      await fetchProfile(user.id)

      // If user hasn't set a password yet, send them to set-password
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profile?.password_set) {
        toast('Please complete your account setup.')
        navigate('/set-password')
      } else {
        navigate('/dashboard')
      }
    }

    handleAuth()
  }, [navigate, fetchProfile])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
    </div>
  )
}

export default AuthCallback
