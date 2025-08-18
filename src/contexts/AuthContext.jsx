import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

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

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error

        setUser(session?.user ?? null)

        if (session?.user) {
          await fetchProfile(session.user.id)
          subscribeToProfile(session.user.id) // ✅ real-time listener
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error('Error getting session:', err.message)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session?.user) {
          // ✅ Covers case where auth user deleted by admin
          console.warn('Auth user deleted or logged out, signing out...')
          await signOut()
          return
        }

        setUser(session.user)
        await fetchProfile(session.user.id)
        subscribeToProfile(session.user.id)
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
      supabase.channel('profiles-changes').unsubscribe()
    }
  }, [])

  const subscribeToProfile = (userId) => {
    // Prevent multiple subscriptions
    supabase.channel('profiles-changes').unsubscribe()

    supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            console.warn('Profile deleted, signing out...')
            await signOut()
          } else if (payload.eventType === 'UPDATE') {
            setProfile(payload.new)
          }
        }
      )
      .subscribe()
  }

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || !data) {
        console.warn('Profile missing or deleted, signing out...')
        await signOut()
        return
      }

      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error.message)
      await signOut()
    }
  }

  const signUp = async (email, password, userData) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ id: data.user.id, email: data.user.email, ...userData }])

      if (profileError) throw profileError
    }

    return data
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    setUser(null)
    setProfile(null)
    supabase.channel('profiles-changes').unsubscribe()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const updateProfile = async (updates) => {
    if (!user) throw new Error('No user logged in')

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    setProfile(data)
    return data
  }

  const sendVerificationEmail = async (email) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/set-password` }
    })
    if (error) throw error
    return data
  }

  const setPassword = async (email, password, userData) => {
    const { data: userDataResponse, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (userError && userError.code !== 'PGRST116') throw userError

    const { data: authData, error: authError } = await supabase.auth.updateUser({ password })
    if (authError) throw authError

    if (userDataResponse) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update(userData)
        .eq('email', email)
        .select()
        .single()
      if (profileError) throw profileError
      setProfile(profileData)
    } else {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert([{ email, ...userData }])
        .select()
        .single()
      if (profileError) throw profileError
      setProfile(profileData)
    }

    return authData
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    fetchProfile,
    sendVerificationEmail,
    setPassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
