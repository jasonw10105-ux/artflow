// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // ==========================
  // Initialize auth session
  // ==========================
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Handle magic link if present in URL
        const hash = window.location.hash
        if (hash.includes('access_token')) {
          const params = new URLSearchParams(hash.replace('#', ''))
          const access_token = params.get('access_token')
          const refresh_token = params.get('refresh_token')

          if (access_token && refresh_token) {
            const { data, error } = await supabase.auth.setSession({ access_token, refresh_token })
            if (error) throw error
            console.log('Magic link session set', data)
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        }

        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
          subscribeToProfile(session.user.id)
        } else setProfile(null)
      } catch (err) {
        console.error('Error initializing auth:', err)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        await signOut()
        return
      }
      setUser(session.user)
      await fetchProfile(session.user.id)
      subscribeToProfile(session.user.id)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
      supabase.channel('profiles-changes').unsubscribe()
    }
  }, [])

  // ==========================
  // Profile subscription
  // ==========================
  const subscribeToProfile = (userId) => {
    supabase.channel('profiles-changes').unsubscribe()
    supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        async (payload) => {
          if (payload.eventType === 'DELETE') await signOut()
          else if (payload.eventType === 'UPDATE') setProfile(payload.new)
        }
      )
      .subscribe()
  }

  // ==========================
  // Fetch profile from DB
  // ==========================
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (error || !data) {
        await signOut()
        return
      }
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
      await signOut()
    }
  }

  // ==========================
  // Sign up with magic link
  // ==========================
  const signUp = async (email) => {
    const { data: existing } = await supabase.from('profiles').select('id').eq('email', email).single()
    if (existing) throw new Error('Email already exists. Please log in.')
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/set-password` }
    })
    if (error) throw error
    return data
  }

  // ==========================
  // Complete signup with password & profile
  // ==========================
  const completeSignUp = async (password, userType, bio, name) => {
    if (!user) throw new Error('No user session found')
    const { data: authData, error: authError } = await supabase.auth.updateUser({ password })
    if (authError) throw authError

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: user.id, email: user.email, user_type: userType, bio, name })
      .select()
      .single()
    if (profileError) throw profileError

    setProfile(profileData)
    return profileData
  }

  // ==========================
  // Sign in with email/password
  // ==========================
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  // ==========================
  // Sign out
  // ==========================
  const signOut = async () => {
    setUser(null)
    setProfile(null)
    supabase.channel('profiles-changes').unsubscribe()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // ==========================
  // Update profile
  // ==========================
  const updateProfile = async (updates) => {
    if (!user) throw new Error('No user logged in')
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', user.id).select().single()
    if (error) throw error
    setProfile(data)
    return data
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signUp,
        completeSignUp,
        signIn,
        signOut,
        updateProfile,
        fetchProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
