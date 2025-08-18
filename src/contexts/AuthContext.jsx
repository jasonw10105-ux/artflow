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
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Helper: unsubscribe all channels
  const unsubscribeAll = async () => {
    supabase.channel('profiles-changes').unsubscribe()
  }

  const signOut = async () => {
    setUser(null)
    setProfile(null)
    await unsubscribeAll()
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Sign out error:', error)
  }

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error || !data) {
        // profile deleted → sign out
        await signOut()
        return null
      }
      setProfile(data)
      return data
    } catch (err) {
      console.error('Fetch profile error:', err)
      await signOut()
      return null
    }
  }

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

  useEffect(() => {
    const initAuth = async () => {
      try {
        const hash = window.location.hash
        if (hash.includes('access_token')) {
          const params = new URLSearchParams(hash.replace('#', ''))
          const access_token = params.get('access_token')
          const refresh_token = params.get('refresh_token')

          if (access_token && refresh_token) {
            const { data, error } = await supabase.auth.setSession({
              access_token,
              refresh_token
            })
            if (error) throw error
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        }

        const {
          data: { session },
          error
        } = await supabase.auth.getSession()
        if (error) throw error

        if (!session?.user) {
          setUser(null)
          setProfile(null)
          return
        }

        setUser(session.user)
        const prof = await fetchProfile(session.user.id)

        // If profile exists but no password set, push to /set-password
        if (prof && !prof.password_set) {
          navigate('/set-password')
        }

        subscribeToProfile(session.user.id)
      } catch (err) {
        console.error('Error initializing auth:', err)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        await signOut()
        return
      }
      setUser(session.user)
      const prof = await fetchProfile(session.user.id)

      if (prof && !prof.password_set) {
        navigate('/set-password')
      }

      subscribeToProfile(session.user.id)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
      unsubscribeAll()
    }
  }, [])

  const signUp = async (email) => {
    // Sends magic link for email verification
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/set-password` }
    })
    if (error) throw error
    return data
  }

  const completeSignUp = async (password, userType, bio) => {
    if (!user) throw new Error('No user session found')
    const { data: authData, error: authError } = await supabase.auth.updateUser({ password })
    if (authError) throw authError

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        user_type: userType,
        bio,
        password_set: true
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
