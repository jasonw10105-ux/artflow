// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import toast from 'react-hot-toast'

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // --- Sign up (email only) ---
  const signUp = async (email) => {
    try {
      const { data, error } = await supabase.auth.signUp(
        { email },
        { emailRedirectTo: `${window.location.origin}/set-password` }
      )
      return { data, error }
    } catch (err) {
      return { error: err }
    }
  }

  // --- Send OTP / Magic Link ---
  const sendOtp = async (email) => {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/set-password` }
      })
      return { data, error }
    } catch (err) {
      return { error: err }
    }
  }

  // --- Complete signup by setting password and profile ---
  const completeSignUp = async (password, userType, bio, name) => {
    if (!user) throw new Error('No active session')

    // 1. Update Supabase password
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) throw updateError

    // 2. Update profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email,
          name,
          bio,
          user_type: userType,
          password_set: true
        },
        { onConflict: ['id'] }
      )

    if (profileError) throw profileError

    // 3. Refresh profile
    const { data: updatedProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (fetchError) throw fetchError
    setProfile(updatedProfile)
  }

  // --- Load user and profile on mount ---
  useEffect(() => {
    const session = supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user ?? null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) setProfile(null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // --- Load profile when user changes ---
  useEffect(() => {
    if (!user) return
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (error) {
        if (error.code !== 'PGRST116') console.error(error)
        setProfile(null)
      } else {
        setProfile(data)
      }
    }
    fetchProfile()
  }, [user])

  const value = {
    user,
    profile,
    loading,
    signUp,
    sendOtp,
    completeSignUp
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
