// src/pages/AuthCallback.jsx
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const AuthCallback = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href)

      if (error) {
        console.error(error)
        toast.error('Authentication failed. Please try again.')
        navigate('/login')
        return
      }

      const { user } = data.session

      // 👇 Check if user has a password set
      const hasPassword = user.app_metadata?.provider === 'email' && !!user.password

      if (!hasPassword) {
        toast('Please set your password')
        navigate('/set-password')
      } else {
        toast.success('Signed in!')
        navigate('/dashboard')
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="flex items-center justify-center h-screen">
      <p>Completing sign-in…</p>
    </div>
  )
}

export default AuthCallback
