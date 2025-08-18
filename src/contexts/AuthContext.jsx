// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

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
  const navigate = useNavigate()
  const [profileSub, setProfileSub] = useState(null)

  // --- Sign Out ---
  const signOut = async () => {
    setUser(null)
    setProfile(null)
    try {
      supabase.getChannels().forEach(channel => channel.unsubscribe())
    } catch (err) {
      console.error('Channel cleanup failed', err)
    }
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Supabase sign out error', error)
  }

  // --- Fetch Profile ---
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error || !data) {
        await signOut()
        return null
      }
      setProfile(data)
      return data
    } catch (err) {
      console.error('Error fetching profile', err)
      await signOut()
      return null
    }
  }

  // --- Subscribe to Profile Changes ---
  const subscribeToProfile = (userId) => {
    // clean previous subscription
    if (profileSub) profileSub.unsubscribe()

    const channel = supabase
      .channel(`profiles-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            await signOut()
          } else if (payload.eventType === 'UPDATE') {
            setProfile(payload.new)
          }
        }
      )
      .subscribe()

    setProfileSub(channel)
  }

  // --- Initialize Auth on load ---
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true)
      try {
        // 1. Check for magic link in URL
        const hash = window.location.hash
        if (hash.includes('access_token')) {
          const params = new URLSearchParams(hash.replace('#', ''))
          const access_token = params.get('access_token')
          const refresh_token = params.get('refresh_token')
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token
            })
            if (error) throw error
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        }

        // 2. Get current session
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.user) {
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }

        setUser(session.user)

        const userProfile = await fetchProfile(session.user.id)

        // Redirect logic for /set-password
        if (userProfile?.password_set !== true) {
          navigate('/set-password', { replace: true })
        }

        // Subscribe to profile
        if (userProfile) subscribeToProfile(session.user.id)

      } catch (err) {
        console.error('Error initializing auth:', err)
        await signOut()
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // 3. Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        await signOut()
        setLoading(false)
        return
      }
      setUser(session.user)
      const userProfile = await fetchProfile(session.user.id)
      if (userProfile?.password_set !== true) navigate('/set-password', { replace: true })
      if (userProfile) subscribeToProfile(session.user.id)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
      if (profileSub) profileSub.unsubscribe()
    }
  }, [])

  // --- Sign Up (send magic link) ---
  const signUp = async (email) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/set-password` }
    })
    if (error) throw error
    return data
  }

  // --- Complete Sign Up / Set Password ---
  const completeSignUp = async (password, userType, bio) => {
    if (!user) throw new Error('No user session found')
    // 1. Update password
    const { data: authData, error: authError } = await supabase.auth.updateUser({ password })
    if (authError) throw authError
    // 2. Upsert profile with password_set
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: user.id, email: user.email, user_type: userType, bio, password_set: true })
      .select()
      .single()
    if (profileError) throw profileError
    setProfile(profileData)
    return profileData
  }

  // --- Sign In (email/password) ---
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  // --- Update Profile ---
  const updateProfile = async (updates) => {
    if (!user) throw new Error('No user logged in')
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', user.id).select().single()
    if (error) throw error
    setProfile(data)
    return data
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signUp,
      completeSignUp,
      signIn,
      signOut,
      updateProfile,
      fetchProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}
