// src/pages/SetPassword.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const SetPassword = () => {
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        // ❌ no session → block access
        toast.error('Please log in first.')
        navigate('/login')
        return
      }

      // 👇 If they already have a password, redirect
      const { user } = data.session
      const hasPassword = user.app_metadata?.provider === 'email' && !!user.password
      if (hasPassword) {
        navigate('/dashboard')
      }
    }
    checkSession()
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Password set successfully!')
    navigate('/dashboard')
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <form onSubmit={handleSubmit} className="p-6 bg-white rounded shadow-md w-80">
        <h2 className="text-xl font-semibold mb-4">Set Your Password</h2>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full p-2 border rounded mb-4"
        />
        <button type="submit" className="w-full bg-black text-white p-2 rounded">
          Save Password
        </button>
      </form>
    </div>
  )
}

export default SetPassword
