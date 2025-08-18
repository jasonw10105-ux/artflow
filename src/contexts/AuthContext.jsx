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
        // Check for magic link in URL
        const hash = window.location.hash
        if (hash.includes('access_token')) {
          const params = new URLSearchParams(hash.replace('#', ''))
          const access_token = params.get('access_token')
          if (access_token) {
            const { data, error } = await supabase.auth.setSession({ access_token })
            if (error) throw error
            setUser(data.user)
            await fetchProfile(data.user.id)
            subscribeToProfile(data.user.id)
            setLoading(false)
            return
          }
        }

        // Normal session
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error

        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
          subscribeToProfile(session.user.id)
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
        await signOut()
        return
      }

      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error.message)
      await signOut()
    }
  }

  const signUp = async (email) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/set-password` }
    })
    if (error) throw error
    return data
  }

  const completeSignUp = async (password, userType, bio, magicToken = null) => {
  let currentUser = user

  // If there's no active session but a magic token exists, recover the session
  if (!currentUser && magicToken) {
    try {
      const { data: { session }, error } = await supabase.auth.exchangeOtpForSession({
        otp: magicToken
      })
      if (error) throw error
      currentUser = session.user
      setUser(currentUser)
    } catch (err) {
      console.error('Error exchanging magic token:', err.message)
      throw new Error('Magic link expired or invalid. Please request a new link.')
    }
  }

  if (!currentUser) throw new Error('No user session found')

  // Update password
  const { data: authData, error: authError } = await supabase.auth.updateUser({
    password
  })
  if (authError) throw authError

  // Update profile
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: currentUser.id,
      email: currentUser.email,
      user_type: userType,
      bio
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

  const value = {
    user,
    profile,
    loading,
    signUp,
    completeSignUp,
    signIn,
    signOut,
    updateProfile,
    fetchProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
