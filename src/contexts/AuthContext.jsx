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

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error

        setUser(session?.user ?? null)

        if (session?.user) {
          await ensureProfile(session.user)
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
        await ensureProfile(session.user)
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
  }

  // Ensure a profile exists for the logged-in user
  const ensureProfile = async (user) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code === 'PGRST116') {
        // Profile not found, create it
        const { data: profileData, error: insertError } = await supabase
          .from('profiles')
          .insert([{ id: user.id, email: user.email }])
          .select()
          .single()
        if (insertError) throw insertError
        setProfile(profileData)
      } else if (error) {
        throw error
      } else {
        setProfile(data)
      }
    } catch (err) {
      console.error('Error ensuring profile:', err.message)
      setProfile(null)
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

  const completeSignUp = async (password, userType, bio) => {
    if (!user) throw new Error('No user session found')

    // Update password
    const { data: authData, error: authError } = await supabase.auth.updateUser({ password })
    if (authError) throw authError

    // Upsert profile with role and bio
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
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
    fetchProfile: () => ensureProfile(user)
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
