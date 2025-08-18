import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const session = supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user || null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data }) => setProfile(data))
        .catch((err) => console.error(err))
    } else {
      setProfile(null)
    }
  }, [user])

  // Sign in with email + password
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  // Sign up (magic link) - email verification
  const signUp = async (email) => {
    const { data, error } = await supabase.auth.signUp({ email })
    if (error) throw error
    return data
  }

  // Complete signup: set password + update profile
  const completeSignUp = async (password, userType, name, bio) => {
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) throw updateError

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      user_type: userType,
      name,
      bio
    })
    if (profileError) throw profileError
  }

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, completeSignUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
