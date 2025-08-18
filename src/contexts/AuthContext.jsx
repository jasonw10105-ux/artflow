// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      if (session?.user) await fetchProfile(session.user.id)
      setLoading(false)
    }

    getSession()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_, session) => {
      setUser(session?.user || null)
      if (session?.user) await fetchProfile(session.user.id)
      setLoading(false)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // Fetch profile from 'profiles' table
  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) {
      console.error('Error fetching profile:', error)
      setProfile(null)
    } else {
      setProfile(data)
    }
  }

  // Sign up sends magic link
  const signUp = async (email) => {
    const { error } = await supabase.auth.signUp({ email })
    if (error) throw error
  }

  // Sign in with email + password
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data.user
  }

  // Check if the user has set a password (after magic link verification)
  const checkPasswordSet = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('password_set')
      .eq('id', userId)
      .single()
    if (error) {
      console.error('Error checking password:', error)
      return false
    }
    return data?.password_set || false
  }

  // Complete signup: set password and update profile
  const completeSignUp = async (password, userType, bio) => {
    if (!user) throw new Error('No active session')
    
    // Update password via Supabase
    const { error: updatePasswordError } = await supabase.auth.updateUser({ password })
    if (updatePasswordError) throw updatePasswordError

    // Update profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        user_type: userType,
        bio,
        password_set: true
      })
    if (profileError) throw profileError

    // Refresh local state
    await fetchProfile(user.id)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signUp,
        signIn,
        checkPasswordSet,
        completeSignUp
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
