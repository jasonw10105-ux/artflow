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

  useEffect(() => {
    if (!user) return setProfile(null)

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (error) console.error('Error fetching profile:', error)
      else setProfile(data)
    }

    fetchProfile()
  }, [user])

  // Send OTP to email
  const sendOtp = async (email) => {
    return await supabase.auth.signInWithOtp({ email })
  }

  // Login with OTP code
  const verifyOtp = async (email, token) => {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'magiclink' })
    if (error) throw error
    setUser(data.user)
    return data.user
  }

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
