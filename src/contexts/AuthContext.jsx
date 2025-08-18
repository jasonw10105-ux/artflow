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
    const session = supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user || null)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    setLoading(false)

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email) => {
    const { error } = await supabase.auth.signUp({ email })
    if (error) throw error
  }

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const checkPasswordSet = async (email) => {
    // Supabase stores password_hash in auth.users metadata
    const { data, error } = await supabase
      .from('auth.users')
      .select('id, email, password_hash')
      .eq('email', email)
      .single()

    if (error) {
      console.error('checkPasswordSet error:', error)
      return false
    }

    return !!data.password_hash
  }

  const completeSignUp = async (password, userType, bio) => {
    if (!user) throw new Error('No active user')
    
    // Update password
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) throw updateError

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        user_type: userType,
        bio
      })
    if (profileError) throw profileError
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
