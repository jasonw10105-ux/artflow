import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileSubscription, setProfileSubscription] = useState(null)

  // Fetch profile
  const fetchProfile = async (userId) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error) {
      console.error('Error fetching profile:', error.message)
      setProfile(null)
    } else {
      setProfile(data)
    }
  }

  // Subscribe to profile changes
  const subscribeToProfile = (userId) => {
    if (profileSubscription) profileSubscription.unsubscribe()

    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => setProfile(payload.new)
      )
      .subscribe()

    setProfileSubscription(channel)
  }

  // Initialize auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Supabase handles magic-link + session automatically
        const {
          data: { session },
          error
        } = await supabase.auth.getSession()
        if (error) throw error

        setUser(session?.user ?? null)

        if (session?.user) {
          await fetchProfile(session.user.id)
          subscribeToProfile(session.user.id)
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error('Error initializing auth:', err.message)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setUser(null)
        setProfile(null)
      } else {
        setUser(session.user)
        await fetchProfile(session.user.id)
        subscribeToProfile(session.user.id)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
      if (profileSubscription) profileSubscription.unsubscribe()
    }
  }, [])

  const signUp = async (email, password) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/set-password`, // MUST match Supabase settings
      },
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
