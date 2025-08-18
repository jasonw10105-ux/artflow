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
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false)

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Handle magic link
        const hash = window.location.hash
        if (hash.includes('access_token')) {
          const params = new URLSearchParams(hash.replace('#', ''))
          const access_token = params.get('access_token')
          const refresh_token = params.get('refresh_token')
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token })
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        }

        // Get session
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id)
          if (!profileData) setNeedsPasswordSetup(true)
          else setProfile(profileData)
        }
      } catch (err) {
        console.error('Error initializing auth:', err)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id)
          if (!profileData) setNeedsPasswordSetup(true)
          else setProfile(profileData)
        } else {
          setProfile(null)
          setNeedsPasswordSetup(false)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error || !data) return null
    return data
  }

  // Check if user exists with password
  const checkUserByEmail = async (email) => {
    const { data, error } = await supabase.auth.admin.listUsers()
    if (error) throw error
    const found = data.users.find(u => u.email === email)
    if (!found) return { exists: false }
    if (found?.password_hash) return { exists: true, hasPassword: true }
    return { exists: true, hasPassword: false }
  }

  const signUp = async (email) => {
    const check = await checkUserByEmail(email)
    if (check.exists && check.hasPassword) throw new Error('User already exists, please log in')
    if (check.exists && !check.hasPassword) return { redirectTo: '/set-password' }

    // Send magic link
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/set-password` }
    })
    if (error) throw error
    return data
  }

  const completeSignUp = async (password, userType, bio, name) => {
    if (!user) throw new Error('No user session found')
    await supabase.auth.updateUser({ password })

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: user.id, email: user.email, user_type: userType, bio, name })
      .select()
      .single()
    if (profileError) throw profileError

    setProfile(profileData)
    setNeedsPasswordSetup(false)
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
    setNeedsPasswordSetup(false)
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      needsPasswordSetup,
      signUp,
      completeSignUp,
      signIn,
      signOut,
      fetchProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}
