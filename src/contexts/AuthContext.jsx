import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
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
  const profileChannel = useRef(null)

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Handle magic link in URL
        const { data: sessionData, error: sessionError } = await supabase.auth.getSessionFromUrl({ storeSession: true })
        if (sessionError) throw sessionError

        const currentSession = sessionData?.session
        setUser(currentSession?.user ?? null)

        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id)
          subscribeToProfile(currentSession.user.id)
        } else {
          setProfile(null)
        }

      } catch (err) {
        console.error('Error initializing auth:', err)
      } finally {
        setLoading(false)
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }

    initAuth()

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
      if (profileChannel.current) profileChannel.current.unsubscribe()
    }
  }, [])

  const subscribeToProfile = (userId) => {
    if (profileChannel.current) profileChannel.current.unsubscribe()
    profileChannel.current = supabase
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

  const signUp = async (email) => {
    const { data: existing } = await supabase.from('profiles').select('id').eq('email', email).single()
    if (existing) throw new Error('Email already exists. Please log in.')
    return await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/set-password` } })
  }

  const completeSignUp = async ({ password, userType, bio, name }) => {
  if (!user) throw new Error('No user session found')

  // Update user password
  const { data: authData, error: authError } = await supabase.auth.updateUser({ password })
  if (authError) throw authError

  // Upsert full profile
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email,
      user_type: userType,
      bio,
      name
    })
    .select()
    .single()

  if (profileError) throw profileError
  setProfile(profileData)
  return profileData
}
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    setUser(null)
    setProfile(null)
    if (profileChannel.current) profileChannel.current.unsubscribe()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const updateProfile = async (updates) => {
    if (!user) throw new Error('No user logged in')
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', user.id).select().single()
    if (error) throw error
    setProfile(data)
    return data
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, completeSignUp, signIn, signOut, updateProfile, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
