// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Initial session load + listener
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }
    init()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Fetch profile whenever user changes
  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return
      }

      setProfile(data)
    }

    fetchProfile()
  }, [user])

  // ----------------------
  // OTP Login Flow
  // ----------------------

  // Send OTP to email
  const sendOtp = async (email) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/verify-otp' }
    })
    return { data, error }
  }

  // Verify OTP by reloading session (Supabase automatically signs in if OTP link clicked)
  const verifyOtp = async (email, _otp) => {
    // Supabase handles OTP via email link automatically
    // You just need to refresh session
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    if (!session?.user) throw new Error('OTP verification failed.')
    setUser(session.user)
    return session.user
  }

  // Complete signup: set password + update profile
  const completeSignUp = async (password, userType, bio, name) => {
    const { data, error } = await supabase.auth.updateUser({ password })
    if (error) throw error

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id,
      email: data.user.email,
      name,
      bio,
      user_type: userType,
      password_set: true,
      updated_at: new Date(),
    })

    if (profileError) throw profileError

    setProfile({ name, bio, user_type: userType, password_set: true })
    return data.user
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        sendOtp,
        verifyOtp,
        completeSignUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
