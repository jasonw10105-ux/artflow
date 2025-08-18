import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false)

  useEffect(() => {
    const session = supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) handleUser(data.session.user)
      else setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) handleUser(session.user)
      else setUser(null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const handleUser = async (supabaseUser) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.getUserById(supabaseUser.id)
      if (error) throw error

      // Check if user is verified but has no password
      if (data.user?.email_confirmed_at && !data.user?.password_hash) {
        setNeedsPasswordSetup(true)
      } else {
        setNeedsPasswordSetup(false)
      }

      setUser(data.user)
    } catch (err) {
      console.error('Auth error:', err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signUp = async (email) => {
    const { data, error } = await supabase.auth.signUp({ email })
    if (error) throw error
    return data
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, needsPasswordSetup }}
    >
      {children}
    </AuthContext.Provider>
  )
}
